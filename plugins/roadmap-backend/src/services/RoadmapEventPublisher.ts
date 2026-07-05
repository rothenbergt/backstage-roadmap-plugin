import { LoggerService } from '@backstage/backend-plugin-api';
import { EventsService } from '@backstage/plugin-events-node';
import { SignalsService } from '@backstage/plugin-signals-node';
import {
  Feature,
  Comment,
  FeatureStatus,
  RoadmapSignal,
  EVENTS_TOPIC_ROADMAP,
  EVENTS_ACTION_CREATE_FEATURE,
  EVENTS_ACTION_UPDATE_FEATURE,
  EVENTS_ACTION_DELETE_FEATURE,
  EVENTS_ACTION_CHANGE_FEATURE_STATUS,
  EVENTS_ACTION_TOGGLE_VOTE,
  EVENTS_ACTION_CREATE_COMMENT,
  EVENTS_ACTION_DELETE_COMMENT,
  EVENTS_ACTION_REORDER_BOARD,
  SIGNALS_CHANNEL_ROADMAP,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Publishes roadmap changes to the events service (for integrations) and the
 * signals service (for live UI updates). Both services are optional and every
 * publish is fire-and-forget: a missing or failing service never breaks a
 * roadmap request.
 */
export class RoadmapEventPublisher {
  constructor(
    private readonly logger: LoggerService,
    private readonly events?: EventsService,
    private readonly signals?: SignalsService,
  ) {}

  featureCreated(feature: Feature, actor: string): void {
    this.publishEvent(EVENTS_ACTION_CREATE_FEATURE, { feature, actor });
    this.broadcast({ kind: 'feature_created', featureId: feature.id, feature });
  }

  featureUpdated(feature: Feature, actor: string): void {
    this.publishEvent(EVENTS_ACTION_UPDATE_FEATURE, { feature, actor });
    this.broadcast({ kind: 'feature_updated', featureId: feature.id, feature });
  }

  featureDeleted(featureId: string, actor: string): void {
    this.publishEvent(EVENTS_ACTION_DELETE_FEATURE, { featureId, actor });
    this.broadcast({ kind: 'feature_deleted', featureId });
  }

  statusChanged(
    feature: Feature,
    previousStatus: FeatureStatus,
    actor: string,
  ): void {
    this.publishEvent(EVENTS_ACTION_CHANGE_FEATURE_STATUS, {
      feature,
      previousStatus,
      actor,
    });
    this.broadcast({ kind: 'status_changed', featureId: feature.id, feature });
  }

  voteToggled(
    featureId: string,
    voteAdded: boolean,
    voteCount: number,
    actor: string,
  ): void {
    this.publishEvent(EVENTS_ACTION_TOGGLE_VOTE, {
      featureId,
      voteAdded,
      voteCount,
      actor,
    });
    this.broadcast({ kind: 'vote_changed', featureId });
  }

  commentAdded(comment: Comment, actor: string): void {
    this.publishEvent(EVENTS_ACTION_CREATE_COMMENT, { comment, actor });
    this.broadcast({ kind: 'comment_added', featureId: comment.featureId });
  }

  commentDeleted(commentId: string, actor: string): void {
    this.publishEvent(EVENTS_ACTION_DELETE_COMMENT, { commentId, actor });
    this.broadcast({ kind: 'comment_deleted' });
  }

  boardReordered(status: FeatureStatus, actor: string): void {
    this.publishEvent(EVENTS_ACTION_REORDER_BOARD, { status, actor });
    this.broadcast({ kind: 'board_reordered' });
  }

  private publishEvent(action: string, eventPayload: unknown): void {
    if (!this.events) {
      return;
    }
    this.events
      .publish({
        topic: EVENTS_TOPIC_ROADMAP,
        eventPayload: eventPayload as object,
        metadata: { action },
      })
      .catch(error => {
        this.logger.warn(`Failed to publish roadmap event ${action}: ${error}`);
      });
  }

  private broadcast(message: RoadmapSignal): void {
    if (!this.signals) {
      return;
    }
    this.signals
      .publish<RoadmapSignal>({
        recipients: { type: 'broadcast' },
        channel: SIGNALS_CHANNEL_ROADMAP,
        message,
      })
      .catch(error => {
        this.logger.warn(`Failed to broadcast roadmap signal: ${error}`);
      });
  }
}
