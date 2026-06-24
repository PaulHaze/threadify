import { spotifyGet, spotifyGetAll, spotifyPost } from './spotify.js'
import type { BuildPlaylistOpts } from './types.js'

export function dedupeTrackIds(incoming: string[], existing: string[]): string[] {
  const set = new Set(existing)
  return incoming.filter(id => !set.has(id))
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

interface PlaylistResponse {
  id: string;
  external_urls: { spotify: string };
}

async function getExistingTrackIds(playlistId: string, token: string): Promise<string[]> {
  const items = await spotifyGetAll<{ track: { id: string } | null }>(
    `/playlists/${playlistId}/tracks?limit=50`,
    token,
  )
  return items.filter(i => i.track !== null).map(i => i.track!.id)
}

export async function buildPlaylist(opts: BuildPlaylistOpts, token: string): Promise<string> {
  let playlistId = opts.existingPlaylistId

  if (!playlistId) {
    const created = await spotifyPost('/me/playlists', token, {
      name: opts.name,
      description: opts.description ?? '',
      public: !opts.isPrivate,
    }) as PlaylistResponse
    playlistId = created.id
  }

  const existingIds = opts.existingPlaylistId
    ? await getExistingTrackIds(playlistId, token)
    : []

  const toAdd = dedupeTrackIds(opts.trackIds, existingIds)
  const uris = toAdd.map(id => `spotify:track:${id}`)

  for (const chunk of chunkArray(uris, 100)) {
    await spotifyPost(`/playlists/${playlistId}/tracks`, token, { uris: chunk })
  }

  const playlist = await spotifyGet(`/playlists/${playlistId}`, token) as PlaylistResponse
  return playlist.external_urls.spotify
}
