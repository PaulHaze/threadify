export interface ExtractedItem {
  artist: string;
  album?: string;
  track?: string;
  snippet: string;
  confidence: "high" | "medium" | "low";
  include: boolean;
}

export interface ParsedOutput {
  source: {
    url: string;
    fetchedAt: string;
  };
  items: ExtractedItem[];
}

export interface SpotifyMatch {
  trackIds: string[];
  albumId: string;
  artistId: string;
  artistName: string;
  albumName: string;
}

export interface ResolvedItem {
  input: ExtractedItem;
  match: SpotifyMatch | null;
  alternates: SpotifyMatch[];
}

export interface LLMConfig {
  apiKey: string;
  model: string;
}

export interface ResolutionSummary {
  matched: ResolvedItem[];
  unmatched: ResolvedItem[];
  artistOnly: ResolvedItem[];
}

export interface BuildPlaylistOpts {
  name: string;
  description?: string;
  isPrivate: boolean;
  trackIds: string[];
  existingPlaylistId?: string;
}
