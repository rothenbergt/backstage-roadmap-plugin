/**
 * Lifecycle status of a roadmap feature.
 *
 * @public
 */
export enum FeatureStatus {
  Suggested = 'Suggested',
  Planned = 'Planned',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Declined = 'Declined',
}

/**
 * A roadmap feature as returned by the roadmap API.
 *
 * Type alias (not interface) so it satisfies JsonObject for events/signals.
 *
 * @public
 */
export type Feature = {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  votes: number;
  author: string;
  /** ISO 8601 UTC timestamp. */
  createdAt: string;
  /** ISO 8601 UTC timestamp. */
  updatedAt: string;
  /** Sort order within status (database datasource). */
  boardPosition?: number;
};

/**
 * Payload for suggesting a new feature.
 *
 * @public
 */
export interface NewFeature {
  title: string;
  description: string;
}

/**
 * A comment on a roadmap feature.
 *
 * @public
 */
export interface Comment {
  id: string;
  author: string;
  featureId: string;
  text: string;
  /** ISO 8601 UTC timestamp. */
  createdAt: string;
  /** ISO 8601 UTC timestamp. */
  updatedAt: string;
}

/**
 * Payload for adding a comment to a feature.
 *
 * @public
 */
export interface NewComment {
  text: string;
  featureId: string;
  author?: string;
}

/**
 * A board column with the features it contains.
 *
 * @public
 */
export interface Column {
  title: string;
  features: Feature[];
}

/**
 * Result of toggling a vote on a feature.
 *
 * @public
 */
export interface VoteResponse {
  voteAdded: boolean;
  voteCount: number;
}

/**
 * Which timestamp drives retention for a column.
 *
 * @public
 */
export type RoadmapRetentionAnchor = 'created' | 'updated';

/**
 * One column entry after defaults are merged (used by API + UI).
 *
 * @public
 */
export interface RoadmapBoardColumnResolved {
  status: FeatureStatus;
  title: string;
  visible: boolean;
  /** When set (positive), items older than this many days are hidden from the default list (database only). */
  retentionDays?: number;
  retentionAnchor: RoadmapRetentionAnchor;
}

/**
 * Capabilities exposed to the frontend (GitLab = read-only extensions off).
 *
 * @public
 */
export interface RoadmapUiCapabilities {
  retentionFiltering: boolean;
  includeBeyondRetentionQuery: boolean;
  adminEditTitleDescription: boolean;
  adminDeleteFeature: boolean;
  adminDeleteComment: boolean;
  creatorEditDeleteSuggested: boolean;
  adminReorder: boolean;
}

/**
 * Response for GET /features/board-config.
 *
 * @public
 */
export interface RoadmapBoardConfigResponse {
  columns: RoadmapBoardColumnResolved[];
  capabilities: RoadmapUiCapabilities;
}
