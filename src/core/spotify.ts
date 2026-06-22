const SPOTIFY_BASE = "https://api.spotify.com/v1";

export async function spotifyGet(
  path: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status}`);
  return res.json();
}

export async function spotifyPost(
  path: string,
  token: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Spotify POST ${path} failed: ${res.status}`);
  return res.json();
}
