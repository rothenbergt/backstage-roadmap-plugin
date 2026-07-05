import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { RoadmapCollatorFactory } from './RoadmapCollatorFactory';

const features = [
  {
    id: '1',
    title: 'Dark mode',
    description: 'Add dark mode support',
    status: 'Planned',
    votes: 12,
    author: 'user:default/alice',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: '2',
    title: 'Slack integration',
    description: 'Post updates to Slack',
    status: 'Suggested',
    votes: 4,
    author: 'user:default/bob',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
  },
];

const server = setupServer(
  // mockServices.discovery() resolves plugin base URLs to localhost:0
  http.get('http://localhost:0/api/roadmap/features', () =>
    HttpResponse.json(features),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RoadmapCollatorFactory', () => {
  it('indexes roadmap features as documents with deep links', async () => {
    const factory = RoadmapCollatorFactory.fromConfig({
      logger: mockServices.logger.mock(),
      discovery: mockServices.discovery(),
      auth: mockServices.auth(),
    });

    const collator = await factory.getCollator();
    const documents = [];
    for await (const document of collator) {
      documents.push(document);
    }

    expect(documents).toEqual([
      {
        title: 'Dark mode',
        text: 'Add dark mode support',
        location: '/roadmap?feature=1',
        status: 'Planned',
        votes: 12,
        author: 'user:default/alice',
      },
      {
        title: 'Slack integration',
        text: 'Post updates to Slack',
        location: '/roadmap?feature=2',
        status: 'Suggested',
        votes: 4,
        author: 'user:default/bob',
      },
    ]);
  });

  it('has the expected collator type', () => {
    const factory = RoadmapCollatorFactory.fromConfig({
      logger: mockServices.logger.mock(),
      discovery: mockServices.discovery(),
      auth: mockServices.auth(),
    });
    expect(factory.type).toBe('roadmap');
  });
});
