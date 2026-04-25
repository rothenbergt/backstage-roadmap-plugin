export enum FeatureStatus {
  Suggested = 'Suggested',
  Planned = 'Planned',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Declined = 'Declined',
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  votes: number;
  author: string;
  created_at: string;
  updated_at: string;
  /** Sort order within status (database datasource). */
  board_position?: number;
}

export interface NewFeature {
  title: string;
  description: string;
}

export interface Comment {
  id: string;
  author: string;
  featureId: string;
  text: string;
  created_at: string;
  updated_at: string;
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

/** Which timestamp drives retention for a column */
export type RoadmapRetentionAnchor = 'created' | 'updated';

/** One column entry after defaults are merged (used by API + UI). */
export interface RoadmapBoardColumnResolved {
  status: FeatureStatus;
  title: string;
  visible: boolean;
  /** When set (>0), items older than this many days are hidden from default list (database only). */
  retentionDays?: number;
  retentionAnchor: RoadmapRetentionAnchor;
}

/** Capabilities exposed to the frontend (GitLab = read-only extensions off). */
export interface RoadmapUiCapabilities {
  retentionFiltering: boolean;
  includeBeyondRetentionQuery: boolean;
  adminEditTitleDescription: boolean;
  adminDeleteFeature: boolean;
  adminDeleteComment: boolean;
  creatorEditDeleteSuggested: boolean;
  adminReorder: boolean;
}

/** Response for GET /features/board-config */
export interface RoadmapBoardConfigResponse {
  columns: RoadmapBoardColumnResolved[];
  capabilities: RoadmapUiCapabilities;
}
