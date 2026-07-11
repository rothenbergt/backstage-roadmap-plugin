import { TestDatabases, mockServices } from '@backstage/backend-test-utils';
import { Knex } from 'knex';
import { NotFoundError } from '@backstage/errors';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatabaseClient } from './RoadmapDatabaseClient';

const migrationsDir = `${__dirname}/../../migrations`;

// Runs against every locally supported engine: sqlite always, postgres when
// Docker (or a connection string env var) is available, as in CI.
describe('RoadmapDatabaseClient', () => {
  const databases = TestDatabases.create({
    ids: ['SQLITE_3', 'POSTGRES_16'],
  });

  async function createClient(databaseId: string) {
    const knex: Knex = await databases.init(
      databaseId as Parameters<typeof databases.init>[0],
    );
    await knex.migrate.latest({ directory: migrationsDir });
    return new RoadmapDatabaseClient(knex, mockServices.logger.mock());
  }

  it.each(databases.eachSupportedId())(
    'creates and reads features, %p',
    async databaseId => {
      const client = await createClient(databaseId);

      const created = await client.addFeature({
        title: 'Dark mode',
        description: 'Support dark mode everywhere',
        author: 'user:default/guest',
      });

      expect(created).toMatchObject({
        title: 'Dark mode',
        description: 'Support dark mode everywhere',
        status: FeatureStatus.Suggested,
        votes: 0,
        author: 'user:default/guest',
      });
      expect(typeof created.id).toBe('string');
      expect(created.boardPosition).toBeGreaterThan(0);
      // The API contract is ISO 8601 UTC on every engine, even though
      // sqlite and postgres store and return timestamps differently.
      expect(created.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(created.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      const fetched = await client.getFeatureById(created.id);
      expect(fetched).toEqual(created);

      const all = await client.getAllFeatures();
      expect(all).toHaveLength(1);
    },
  );

  it.each(databases.eachSupportedId())(
    'updates status and details, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const created = await client.addFeature({
        title: 'A',
        description: 'B',
        author: 'user:default/guest',
      });

      const planned = await client.updateFeatureStatus(
        created.id,
        FeatureStatus.Planned,
      );
      expect(planned.status).toBe(FeatureStatus.Planned);

      const inProgress = await client.updateFeatureStatus(
        created.id,
        FeatureStatus.InProgress,
      );
      // Round-trips through the DB CHECK value 'InProgress'
      expect(inProgress.status).toBe(FeatureStatus.InProgress);

      const renamed = await client.updateFeatureDetails(created.id, {
        title: 'A2',
      });
      expect(renamed.title).toBe('A2');
      expect(renamed.description).toBe('B');

      await expect(
        client.updateFeatureStatus('9999', FeatureStatus.Planned),
      ).rejects.toThrow(NotFoundError);
    },
  );

  it.each(databases.eachSupportedId())(
    'returns comments with camelCase featureId, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const feature = await client.addFeature({
        title: 'A',
        description: 'B',
        author: 'user:default/guest',
      });

      const comment = await client.addComment({
        featureId: feature.id,
        text: 'Nice idea',
        author: 'user:default/alice',
      });

      // The regression that motivated the store refactor: rows leaked
      // feature_id, so comment.featureId was undefined.
      expect(comment.featureId).toBe(feature.id);
      expect(comment).not.toHaveProperty('feature_id');
      expect(comment.text).toBe('Nice idea');
      expect(comment.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      const comments = await client.getCommentsByFeatureId(feature.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].featureId).toBe(feature.id);

      await expect(
        client.addComment({
          featureId: '9999',
          text: 'orphan',
          author: 'user:default/alice',
        }),
      ).rejects.toThrow(NotFoundError);
    },
  );

  it.each(databases.eachSupportedId())(
    'toggles votes and keeps the counter in sync, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const feature = await client.addFeature({
        title: 'A',
        description: 'B',
        author: 'user:default/guest',
      });

      const first = await client.toggleVote(feature.id, 'user:default/alice');
      expect(first).toEqual({ voteAdded: true, voteCount: 1 });

      const second = await client.toggleVote(feature.id, 'user:default/bob');
      expect(second).toEqual({ voteAdded: true, voteCount: 2 });

      const removed = await client.toggleVote(feature.id, 'user:default/alice');
      expect(removed).toEqual({ voteAdded: false, voteCount: 1 });

      expect(await client.getVoteCount(feature.id)).toBe(1);
      expect(await client.hasVoted(feature.id, 'user:default/bob')).toBe(true);
      expect(await client.hasVoted(feature.id, 'user:default/alice')).toBe(
        false,
      );
      expect(
        await client.hasVotedBatch([feature.id], 'user:default/bob'),
      ).toEqual({ [feature.id]: true });
    },
  );

  it.each(databases.eachSupportedId())(
    'deletes features and cascades comments and votes, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const feature = await client.addFeature({
        title: 'A',
        description: 'B',
        author: 'user:default/guest',
      });
      await client.addComment({
        featureId: feature.id,
        text: 'hi',
        author: 'user:default/alice',
      });
      await client.toggleVote(feature.id, 'user:default/alice');

      await client.deleteFeature(feature.id);

      await expect(client.getFeatureById(feature.id)).rejects.toThrow(
        NotFoundError,
      );
      await expect(client.deleteFeature(feature.id)).rejects.toThrow(
        NotFoundError,
      );
    },
  );

  it.each(databases.eachSupportedId())(
    'reorders features within a status, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const a = await client.addFeature({
        title: 'A',
        description: 'x',
        author: 'user:default/guest',
      });
      const b = await client.addFeature({
        title: 'B',
        description: 'x',
        author: 'user:default/guest',
      });

      await client.reorderFeaturesInStatus(FeatureStatus.Suggested, [
        b.id,
        a.id,
      ]);

      const all = await client.getAllFeatures();
      expect(all.map(f => f.title)).toEqual(['B', 'A']);
    },
  );

  it.each(databases.eachSupportedId())(
    'a status change places the feature at the end of the destination column, %p',
    async databaseId => {
      const client = await createClient(databaseId);
      const first = await client.addFeature({
        title: 'Already planned',
        description: 'x',
        author: 'user:default/guest',
      });
      await client.updateFeatureStatus(first.id, FeatureStatus.Planned);

      const second = await client.addFeature({
        title: 'Moves later',
        description: 'x',
        author: 'user:default/guest',
      });
      // Force a low position in the old column that would sort first if the
      // move carried it over
      await client.reorderFeaturesInStatus(FeatureStatus.Suggested, [
        second.id,
      ]);
      await client.updateFeatureStatus(second.id, FeatureStatus.Planned);

      const planned = (await client.getAllFeatures()).filter(
        f => f.status === FeatureStatus.Planned,
      );
      expect(planned.map(f => f.title)).toEqual([
        'Already planned',
        'Moves later',
      ]);
    },
  );
});
