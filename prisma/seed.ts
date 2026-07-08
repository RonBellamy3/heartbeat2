import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { coverArtUrlForReleaseGroup } from "../src/lib/musicbrainz";
import { findSpotifyArtistPhoto } from "../src/lib/spotify";

// Seeds a starter catalog of well-known albums (real MusicBrainz metadata)
// so search/logging feels alive immediately. Deliberately does NOT create
// any user accounts or logs — those should only ever be real people.

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT =
  process.env.MUSICBRAINZ_USER_AGENT ?? "Heartbeat/0.1 (dev@example.com)";
const MIN_INTERVAL_MS = 1100;

const SEED_ALBUMS: { title: string; artist: string }[] = [
  { title: "Abbey Road", artist: "The Beatles" },
  { title: "Thriller", artist: "Michael Jackson" },
  { title: "Rumours", artist: "Fleetwood Mac" },
  { title: "The Dark Side of the Moon", artist: "Pink Floyd" },
  { title: "Back to Black", artist: "Amy Winehouse" },
  { title: "Random Access Memories", artist: "Daft Punk" },
  { title: "good kid, m.A.A.d city", artist: "Kendrick Lamar" },
  { title: "To Pimp a Butterfly", artist: "Kendrick Lamar" },
  { title: "Blonde", artist: "Frank Ocean" },
  { title: "Channel Orange", artist: "Frank Ocean" },
  { title: "In Rainbows", artist: "Radiohead" },
  { title: "OK Computer", artist: "Radiohead" },
  { title: "Currents", artist: "Tame Impala" },
  { title: "Lemonade", artist: "Beyoncé" },
  { title: "1989", artist: "Taylor Swift" },
  { title: "Folklore", artist: "Taylor Swift" },
  { title: "Nevermind", artist: "Nirvana" },
  { title: "Is This It", artist: "The Strokes" },
  { title: "Funeral", artist: "Arcade Fire" },
  { title: "My Beautiful Dark Twisted Fantasy", artist: "Kanye West" },
  { title: "The College Dropout", artist: "Kanye West" },
  { title: "Discovery", artist: "Daft Punk" },
  { title: "Songs in the Key of Life", artist: "Stevie Wonder" },
  { title: "What's Going On", artist: "Marvin Gaye" },
  { title: "Blue", artist: "Joni Mitchell" },
  { title: "Pet Sounds", artist: "The Beach Boys" },
  { title: "Illmatic", artist: "Nas" },
  { title: "Ready to Die", artist: "The Notorious B.I.G." },
  { title: "Norman Fucking Rockwell!", artist: "Lana Del Rey" },
  { title: "When We All Fall Asleep, Where Do We Go?", artist: "Billie Eilish" },
];

let lastRequestAt = 0;

// Some sandboxed dev networks have a broken IPv6 route to musicbrainz.org
// that causes Node's fetch() to fail outright (while curl forced to IPv4
// works fine). Shell out to curl --ipv4 as a fallback so seeding still gets
// real metadata there; the app itself uses fetch() directly (see
// src/lib/musicbrainz.ts) and degrades gracefully if that ever fails for a
// real user on a normal network.
async function throttledFetchJson(url: string): Promise<unknown> {
  const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      const { stdout } = await execFileAsync("curl", [
        "-s",
        "--ipv4", // this sandbox's IPv6 route to musicbrainz.org is flaky; IPv4 is reliable
        "--max-time",
        "10",
        "-H",
        `User-Agent: ${USER_AGENT}`,
        "-H",
        "Accept: application/json",
        url,
      ]);
      return JSON.parse(stdout);
    } catch {
      return null;
    }
  }
}

interface MBReleaseGroup {
  id: string;
  title: string;
  "first-release-date"?: string;
  "artist-credit"?: { name: string }[];
}

async function fetchAlbumMeta(title: string, artist: string) {
  try {
    const query = `releasegroup:"${title}" AND artist:"${artist}" AND primarytype:Album`;
    const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
    const data = (await throttledFetchJson(url)) as
      | { "release-groups"?: MBReleaseGroup[] }
      | null;
    const rg = data?.["release-groups"]?.[0];
    if (!rg) return null;
    return {
      musicbrainzId: rg.id,
      releaseYear: rg["first-release-date"]
        ? parseInt(rg["first-release-date"].slice(0, 4), 10) || null
        : null,
      coverArtUrl: coverArtUrlForReleaseGroup(rg.id),
    };
  } catch {
    return null;
  }
}

interface MBArtist {
  id: string;
  name: string;
}

async function fetchArtistMbid(name: string): Promise<string | null> {
  try {
    const query = `artist:"${name}"`;
    const url = `${MB_BASE}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
    const data = (await throttledFetchJson(url)) as { artists?: MBArtist[] } | null;
    return data?.artists?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Seeding ${SEED_ALBUMS.length} albums from MusicBrainz…`);

  for (const seedAlbum of SEED_ALBUMS) {
    const existing = await prisma.album.findFirst({
      where: { title: seedAlbum.title, artistName: seedAlbum.artist },
    });
    if (existing) continue;

    const meta = await fetchAlbumMeta(seedAlbum.title, seedAlbum.artist);
    await prisma.album.create({
      data: {
        title: seedAlbum.title,
        artistName: seedAlbum.artist,
        musicbrainzId: meta?.musicbrainzId ?? null,
        releaseYear: meta?.releaseYear ?? null,
        coverArtUrl: meta?.coverArtUrl ?? null,
        genres: "[]",
      },
    });
    console.log(`  + ${seedAlbum.title} — ${seedAlbum.artist}${meta ? "" : " (no MusicBrainz match)"}`);
  }

  const artistNames = [...new Set(SEED_ALBUMS.map((a) => a.artist))];
  console.log(`\nSeeding ${artistNames.length} artist profiles…`);
  for (const name of artistNames) {
    const existing = await prisma.artist.findFirst({ where: { name } });
    if (existing?.photoUrl) continue; // already has a photo — nothing to refresh

    const musicbrainzId = existing?.musicbrainzId ?? (await fetchArtistMbid(name));
    const photo = await findSpotifyArtistPhoto(name);

    await prisma.artist.upsert({
      where: { musicbrainzId: musicbrainzId ?? "__none__" },
      update: {
        photoUrl: photo?.photoUrl,
        spotifyId: photo?.spotifyId,
        photoFetchedAt: new Date(),
      },
      create: {
        name,
        musicbrainzId,
        photoUrl: photo?.photoUrl,
        spotifyId: photo?.spotifyId,
        photoFetchedAt: new Date(),
      },
    });
    console.log(`  + ${name}${photo ? "" : " (no Spotify photo — check credentials)"}`);
  }

  console.log("\nDone. No user accounts or logs were created — sign up to start logging for real.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
