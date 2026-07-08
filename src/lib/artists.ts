import { prisma } from "@/lib/prisma";
import { findSpotifyArtistPhoto } from "@/lib/spotify";
import type { ArtistSearchResult } from "@/lib/musicbrainz";

const PHOTO_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-check Spotify weekly

/** Ensures a local Artist row exists, lazily fetching (and periodically refreshing) a Spotify photo. */
export async function resolveArtist(result: ArtistSearchResult) {
  let artist = await prisma.artist.upsert({
    where: { musicbrainzId: result.musicbrainzId },
    update: {},
    create: { musicbrainzId: result.musicbrainzId, name: result.name },
  });

  const stale =
    !artist.photoFetchedAt || Date.now() - artist.photoFetchedAt.getTime() > PHOTO_REFRESH_MS;
  if (stale) {
    const photo = await findSpotifyArtistPhoto(artist.name);
    artist = await prisma.artist.update({
      where: { id: artist.id },
      data: photo
        ? { spotifyId: photo.spotifyId, photoUrl: photo.photoUrl, photoFetchedAt: new Date() }
        : { photoFetchedAt: new Date() },
    });
  }

  return artist;
}
