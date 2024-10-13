export enum FeatureStatus {
  Suggested = 'Suggested',
  Planned = 'Planned',
  WontDo = "Won't Do",
  Released = 'Released',
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  votes: number;
  author: string;
}

export interface NewFeature {
  title: string;
  description: string;
}

export interface Comment {
  id: string;
  featureId: string;
  text: string;
  created_at: string;
  author: string;
}

export interface NewComment {
  text: string;
  featureId: string;
  author?: string;
}

export interface Column {
  title: string;
  features: Feature[];
}

export interface VoteResponse {
  voteAdded: boolean;
  voteCount: number;
}
