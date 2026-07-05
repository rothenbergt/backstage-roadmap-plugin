import { Feature } from '../types';

/**
 * Events service topic for all roadmap events.
 *
 * @public
 */
export const EVENTS_TOPIC_ROADMAP = 'roadmap';

/**
 * Actions attached to roadmap events (in event metadata).
 *
 * @public
 */
export const EVENTS_ACTION_CREATE_FEATURE = 'create_feature';
/** @public */
export const EVENTS_ACTION_UPDATE_FEATURE = 'update_feature';
/** @public */
export const EVENTS_ACTION_DELETE_FEATURE = 'delete_feature';
/** @public */
export const EVENTS_ACTION_CHANGE_FEATURE_STATUS = 'change_feature_status';
/** @public */
export const EVENTS_ACTION_TOGGLE_VOTE = 'toggle_vote';
/** @public */
export const EVENTS_ACTION_CREATE_COMMENT = 'create_comment';
/** @public */
export const EVENTS_ACTION_DELETE_COMMENT = 'delete_comment';
/** @public */
export const EVENTS_ACTION_REORDER_BOARD = 'reorder_board';

/**
 * Signals channel the roadmap backend broadcasts board updates on.
 *
 * @public
 */
export const SIGNALS_CHANNEL_ROADMAP = 'roadmap:board';

/**
 * Kinds of live board updates carried by {@link RoadmapSignal}.
 *
 * @public
 */
export type RoadmapSignalKind =
  | 'feature_created'
  | 'feature_updated'
  | 'feature_deleted'
  | 'status_changed'
  | 'vote_changed'
  | 'comment_added'
  | 'comment_deleted'
  | 'board_reordered';

/**
 * Signal broadcast on {@link SIGNALS_CHANNEL_ROADMAP} whenever the board
 * changes, so open boards can refresh live instead of waiting for a refetch.
 *
 * @public
 */
export type RoadmapSignal = {
  kind: RoadmapSignalKind;
  /** Present for feature-scoped updates. */
  featureId?: string;
  /** Present when the full feature is cheap to include (create/update/status). */
  feature?: Feature;
};
