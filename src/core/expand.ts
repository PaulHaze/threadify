import { spotifyGet } from "./spotify.js";

interface AlbumMeta {
  album_type: string;
  album_group: string;
  name: string;
}

export function isStudioAlbum(album: AlbumMeta): boolean {
  if (album.album_type !== "album") return false;
  if (album.album_group === "appears_on") return false;
  if (/\blive\b/i.test(album.name)) return false;
  return true;
}

interface SpotifyArtistAlbum extends AlbumMeta {
  id: string;
}

interface ArtistAlbumsResponse {
  items: SpotifyArtistAlbum[];
  next: string | null;
}

export async function expandArtist(
  artistId: string,
  opts: { studioOnly: boolean; cap: number },
  token: string,
): Promise<string[]> {
  const data = (await spotifyGet(
    `/artists/${artistId}/albums?include_groups=album&limit=50`,
    token,
  )) as ArtistAlbumsResponse;

  let albums = data.items;
  if (opts.studioOnly) albums = albums.filter(isStudioAlbum);
  return albums.slice(0, opts.cap).map((a) => a.id);
}
