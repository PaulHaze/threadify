import { spotifyGet } from "./spotify.js";

interface AlbumTracksResponse {
  items: { id: string }[];
}

export async function albumTracks(
  albumId: string,
  token: string,
): Promise<string[]> {
  const data = (await spotifyGet(
    `/albums/${albumId}/tracks?limit=50`,
    token,
  )) as AlbumTracksResponse;
  return data.items.map((t) => t.id);
}
