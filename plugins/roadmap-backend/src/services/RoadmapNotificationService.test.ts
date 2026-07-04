import { mockServices } from '@backstage/backend-test-utils';
import { NotificationService } from '@backstage/plugin-notifications-node';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapNotificationService } from './RoadmapNotificationService';

const feature: Feature = {
  id: '42',
  title: 'Dark mode',
  description: 'Please add dark mode',
  status: FeatureStatus.Planned,
  votes: 3,
  author: 'user:default/alice',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('RoadmapNotificationService', () => {
  let send: jest.Mock;
  let notifications: NotificationService;
  const logger = mockServices.logger.mock();

  const makeService = (adminUsers: string[] = []) =>
    new RoadmapNotificationService(notifications, logger, adminUsers);

  beforeEach(() => {
    send = jest.fn().mockResolvedValue(undefined);
    notifications = { send } as unknown as NotificationService;
  });

  describe('notifyFeatureCreated', () => {
    it('notifies admins, excluding the author', () => {
      const service = makeService([
        'user:default/admin1',
        'user:default/alice',
      ]);
      service.notifyFeatureCreated(feature, 'user:default/alice');
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({
        recipients: { type: 'entity', entityRef: ['user:default/admin1'] },
        payload: expect.objectContaining({
          title: 'New roadmap suggestion: Dark mode',
          link: '/roadmap?feature=42',
          topic: 'new-features',
        }),
      });
    });

    it('skips when no admin recipients are configured', () => {
      makeService([]).notifyFeatureCreated(feature, 'user:default/alice');
      expect(send).not.toHaveBeenCalled();
    });

    it('skips when the author is the only admin', () => {
      makeService(['user:default/alice']).notifyFeatureCreated(
        feature,
        'user:default/alice',
      );
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('notifyStatusChanged', () => {
    it('notifies the feature author with the status transition', () => {
      makeService().notifyStatusChanged(
        feature,
        FeatureStatus.Suggested,
        'user:default/admin1',
      );
      expect(send).toHaveBeenCalledWith({
        recipients: { type: 'entity', entityRef: 'user:default/alice' },
        payload: expect.objectContaining({
          title: `Your roadmap suggestion moved to ${FeatureStatus.Planned}`,
          topic: 'status-changes',
          link: '/roadmap?feature=42',
        }),
      });
    });

    it('does not notify authors about their own changes', () => {
      makeService().notifyStatusChanged(
        feature,
        FeatureStatus.Suggested,
        'user:default/alice',
      );
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('notifyCommentAdded', () => {
    it('notifies the feature author about new comments', () => {
      makeService().notifyCommentAdded(feature, 'user:default/bob');
      expect(send).toHaveBeenCalledWith({
        recipients: { type: 'entity', entityRef: 'user:default/alice' },
        payload: expect.objectContaining({
          title: 'New comment on "Dark mode"',
          topic: 'comments',
        }),
      });
    });

    it('does not notify authors about their own comments', () => {
      makeService().notifyCommentAdded(feature, 'user:default/alice');
      expect(send).not.toHaveBeenCalled();
    });
  });

  it('swallows send failures without throwing', async () => {
    send.mockRejectedValue(new Error('notifications backend unavailable'));
    expect(() =>
      makeService().notifyCommentAdded(feature, 'user:default/bob'),
    ).not.toThrow();
    // Let the rejected promise settle; the failure is only logged.
    await new Promise(resolve => setImmediate(resolve));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send roadmap notification'),
    );
  });
});
