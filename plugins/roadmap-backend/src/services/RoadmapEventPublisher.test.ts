import { mockServices } from '@backstage/backend-test-utils';
import { EventsService } from '@backstage/plugin-events-node';
import { SignalsService } from '@backstage/plugin-signals-node';
import {
  Feature,
  FeatureStatus,
  EVENTS_TOPIC_ROADMAP,
  SIGNALS_CHANNEL_ROADMAP,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapEventPublisher } from './RoadmapEventPublisher';

const feature: Feature = {
  id: '1',
  title: 'Dark mode',
  description: 'Please',
  status: FeatureStatus.Suggested,
  votes: 0,
  author: 'user:default/guest',
  createdAt: '2026-07-04T00:00:00.000Z',
  updatedAt: '2026-07-04T00:00:00.000Z',
};

describe('RoadmapEventPublisher', () => {
  const logger = mockServices.logger.mock();

  const makeEvents = (): jest.Mocked<EventsService> => ({
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  });

  const makeSignals = (): jest.Mocked<SignalsService> => ({
    publish: jest.fn().mockResolvedValue(undefined),
  });

  it('publishes an event and a signal on feature creation', () => {
    const events = makeEvents();
    const signals = makeSignals();
    const publisher = new RoadmapEventPublisher(logger, events, signals);

    publisher.featureCreated(feature, 'user:default/guest');

    expect(events.publish).toHaveBeenCalledWith({
      topic: EVENTS_TOPIC_ROADMAP,
      eventPayload: { feature, actor: 'user:default/guest' },
      metadata: { action: 'create_feature' },
    });
    expect(signals.publish).toHaveBeenCalledWith({
      recipients: { type: 'broadcast' },
      channel: SIGNALS_CHANNEL_ROADMAP,
      message: { kind: 'feature_created', featureId: '1', feature },
    });
  });

  it('includes the previous status on status changes', () => {
    const events = makeEvents();
    const publisher = new RoadmapEventPublisher(logger, events, undefined);

    publisher.statusChanged(
      { ...feature, status: FeatureStatus.Planned },
      FeatureStatus.Suggested,
      'user:default/admin',
    );

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventPayload: expect.objectContaining({
          previousStatus: FeatureStatus.Suggested,
        }),
        metadata: { action: 'change_feature_status' },
      }),
    );
  });

  it('does nothing without events or signals services', () => {
    const publisher = new RoadmapEventPublisher(logger, undefined, undefined);
    expect(() =>
      publisher.voteToggled('1', true, 3, 'user:default/guest'),
    ).not.toThrow();
  });

  it('swallows publish failures', async () => {
    const events = makeEvents();
    events.publish.mockRejectedValue(new Error('bus down'));
    const signals = makeSignals();
    signals.publish.mockRejectedValue(new Error('ws down'));
    const publisher = new RoadmapEventPublisher(logger, events, signals);

    expect(() =>
      publisher.featureDeleted('1', 'user:default/admin'),
    ).not.toThrow();
    // Let the rejected promises settle; failures should only warn.
    await new Promise(resolve => setImmediate(resolve));
  });
});
