const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

function isConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/** Client-credentials grant — app-level access only, no user login involved. */
async function getAccessToken(): Promise<string | null> {
  if (!isConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedToken.value;
  } catch {
    return null;
  }
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
}

/**
 * Finds a Spotify artist photo by name. Returns null (never throws) if
 * Spotify isn't configured, unreachable, or has no match — callers should
 * treat a null photo as a normal, expected state, not an error.
 */
export async function findSpotifyArtistPhoto(
  name: string
): Promise<{ spotifyId: string; photoUrl: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const url = `${API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;

    const data = (await res.json()) as { artists?: { items?: SpotifyArtist[] } };
    const artist = data.artists?.items?.[0];
    const image = artist?.images?.[0];
    if (!artist || !image) return null;

    return { spotifyId: artist.id, photoUrl: image.url };
  } catch {
    return null;
  }
}
