export type MediaType = 'image' | 'video';
export type ReactionType = 'loved' | 'mind_blown' | 'explore' | 'learned';
export type Visibility = 'public' | 'unlisted' | 'private';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
}

export interface Media {
  id: string;
  post_id: string;
  type: MediaType;
  url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  description: string;
  context?: string | null;
  visibility: Visibility;
  media: Media[];
  author?: Profile;
  pulse_status?: 'active' | 'completed';
  pulse_number?: number;
  action?: string | null;
  handoff_from?: Profile | null;
  handoff_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Reaction {
  user_id: string;
  post_id: string;
  type: ReactionType;
}

export interface Collection {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  visibility: Visibility;
}
