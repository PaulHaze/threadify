import { spotifyGetAll } from './spotify.js'

export async function albumTracks(albumId: string, token: string): Promise<string[]> {
  const items = await spotifyGetAll<{ id: string }>(
    `/albums/${albumId}/tracks?limit=50`,
    token,
  )
  return items.map(t => t.id)
}
