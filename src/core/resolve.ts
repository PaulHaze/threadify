import { spotifyGet } from "./spotify.js";
import type { ExtractedItem, SpotifyMatch } from "./types.js";

export function buildSearchQuery(item: ExtractedItem): string {
  if (item.album) return `artist:${item.artist} album:${item.album}`;
  if (item.track) return `artist:${item.artist} track:${item.track}`;
  return `artist:${item.artist}`;
}

export function scoreMatch(
  queryArtist: string,
  queryAlbum: string | undefined,
  resultArtist: string,
  resultAlbum: string,
): number {
  const norm = (s: string) => s.toLowerCase().trim();
  const artistMatch = norm(queryArtist) === norm(resultArtist) ? 1 : 0;
  if (!queryAlbum) return artistMatch;
  const albumMatch =
    norm(queryAlbum) === norm(resultAlbum)
      ? 1
      : norm(resultAlbum).includes(norm(queryAlbum))
        ? 0.5
        : 0;
  return (artistMatch + albumMatch) / 2;
}

interface SpotifyAlbumResult {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  tracks?: { items: { id: string }[] };
}

interface SpotifySearchResponse {
  albums?: { items: SpotifyAlbumResult[] };
  tracks?: {
    items: {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album: SpotifyAlbumResult;
    }[];
  };
}

function albumToMatch(album: SpotifyAlbumResult): SpotifyMatch {
  return {
    albumId: album.id,
    albumName: album.name,
    artistId: album.artists[0]?.id ?? "",
    artistName: album.artists[0]?.name ?? "",
    trackIds: album.tracks?.items.map((t) => t.id) ?? [],
  };
}

export async function resolveToSpotify(
  item: ExtractedItem,
  token: string,
): Promise<{ match: SpotifyMatch | null; alternates: SpotifyMatch[] }> {
  const q = encodeURIComponent(buildSearchQuery(item));
  const type = item.track ? "track" : "album";
  const data = (await spotifyGet(
    `/search?q=${q}&type=${type}&limit=5`,
    token,
  )) as SpotifySearchResponse;

  if (type === "album") {
    const results = (data.albums?.items ?? []).filter((a) => a.id);
    if (results.length === 0) return { match: null, alternates: [] };
    const scored = results.map((a) => ({
      match: albumToMatch(a),
      score: scoreMatch(
        item.artist,
        item.album,
        a.artists[0]?.name ?? "",
        a.name,
      ),
    }));
    scored.sort((a, b) => b.score - a.score);
    return {
      match: scored[0].match,
      alternates: scored.slice(1).map((s) => s.match),
    };
  }

  const tracks = data.tracks?.items ?? [];
  if (tracks.length === 0) return { match: null, alternates: [] };
  return {
    match: {
      albumId: tracks[0].album.id,
      albumName: tracks[0].album.name,
      artistId: tracks[0].artists[0]?.id ?? "",
      artistName: tracks[0].artists[0]?.name ?? "",
      trackIds: [tracks[0].id],
    },
    alternates: tracks.slice(1).map((t) => ({
      albumId: t.album.id,
      albumName: t.album.name,
      artistId: t.artists[0]?.id ?? "",
      artistName: t.artists[0]?.name ?? "",
      trackIds: [t.id],
    })),
  };
}
