import { spotifyGetAll } from './spotify.js'

interface AlbumMeta {
  album_type: string;
  album_group: string;
  name: string;
}

export function isStudioAlbum(album: AlbumMeta): boolean {
  if (album.album_type !== 'album') return false
  if (album.album_group === 'appears_on') return false
  if (/\blive\b/i.test(album.name)) return false
  return true
}

interface SpotifyArtistAlbum extends AlbumMeta {
  id: string;
}

export async function expandArtist(
  artistId: string,
  opts: { studioOnly: boolean; cap: number },
  token: string,
): Promise<string[]> {
  const albums = await spotifyGetAll<SpotifyArtistAlbum>(
    `/artists/${artistId}/albums?include_groups=album&limit=50`,
    token,
  )
  const filtered = opts.studioOnly ? albums.filter(isStudioAlbum) : albums
  return filtered.slice(0, opts.cap).map(a => a.id)
}
