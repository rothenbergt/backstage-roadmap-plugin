import { LoggerService } from '@backstage/backend-plugin-api';
import { NotificationService } from '@backstage/plugin-notifications-node';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';

const featureLink = (id: string) =>
  `/roadmap?feature=${encodeURIComponent(id)}`;

/** Short human-readable name from a user entity ref like `user:default/jdoe`. */
const displayName = (ref: string) => ref.split('/').pop() ?? ref;

/**
 * Sends roadmap notifications through the Backstage notifications service.
 *
 * Every send is fire-and-forget: failures are logged and never propagate to
 * the request that triggered them, so the roadmap works with or without the
 * notifications backend installed.
 *
 * Topics (`new-features`, `status-changes`, `comments`) give users per-topic
 * toggles in Backstage's built-in notification settings.
 */
export class RoadmapNotificationService {
  constructor(
    private readonly notifications: NotificationService,
    private readonly logger: LoggerService,
    private readonly adminUsers: string[],
  ) {}

  /** New feature suggested: notify configured admins, excluding the author. */
  notifyFeatureCreated(feature: Feature, actor: string): void {
    const recipients = this.adminUsers.filter(ref => ref !== actor);
    if (recipients.length === 0) {
      // The permission framework is a decision API and cannot enumerate which
      // users hold roadmap.admin, so recipients always come from
      // roadmap.adminUsers (user or group refs), even in framework mode.
      this.logger.debug(
        'No roadmap.adminUsers configured; skipping new-feature notification',
      );
      return;
    }
    this.send({
      recipients: { type: 'entity', entityRef: recipients },
      payload: {
        title: `New roadmap suggestion: ${feature.title}`,
        description: `${displayName(
          actor,
        )} suggested a new feature for the roadmap.`,
        link: featureLink(feature.id),
        topic: 'new-features',
      },
    });
  }

  /** Status changed: notify the feature author, unless they made the change. */
  notifyStatusChanged(
    feature: Feature,
    previousStatus: string,
    actor: string,
  ): void {
    if (!feature.author || feature.author === actor) {
      return;
    }
    this.send({
      recipients: { type: 'entity', entityRef: feature.author },
      payload: {
        title: `Your roadmap suggestion moved to ${feature.status}`,
        description: `"${feature.title}" changed from ${previousStatus} to ${feature.status}.`,
        link: featureLink(feature.id),
        topic: 'status-changes',
      },
    });
  }

  /** New comment: notify the feature author, unless they wrote it. */
  notifyCommentAdded(feature: Feature, commenter: string): void {
    if (!feature.author || feature.author === commenter) {
      return;
    }
    this.send({
      recipients: { type: 'entity', entityRef: feature.author },
      payload: {
        title: `New comment on "${feature.title}"`,
        description: `${displayName(
          commenter,
        )} commented on your roadmap suggestion.`,
        link: featureLink(feature.id),
        topic: 'comments',
      },
    });
  }

  private send(options: Parameters<NotificationService['send']>[0]): void {
    this.notifications.send(options).catch(error => {
      this.logger.warn(`Failed to send roadmap notification: ${error}`);
    });
  }
}
