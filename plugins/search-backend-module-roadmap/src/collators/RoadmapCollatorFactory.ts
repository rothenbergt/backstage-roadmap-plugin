import { Readable } from 'stream';
import {
  DocumentCollatorFactory,
  IndexableDocument,
} from '@backstage/plugin-search-common';
import {
  AuthService,
  DiscoveryService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Indexable document for roadmap features.
 *
 * @public
 */
export type IndexableRoadmapDocument = IndexableDocument & {
  status: string;
  votes: number;
  author: string;
};

/**
 * Options for {@link RoadmapCollatorFactory}
 *
 * @public
 */
export type RoadmapCollatorFactoryOptions = {
  logger: LoggerService;
  discovery: DiscoveryService;
  auth: AuthService;
};

/**
 * Search collator that indexes roadmap features.
 *
 * @public
 */
export class RoadmapCollatorFactory implements DocumentCollatorFactory {
  public readonly type: string = 'roadmap';

  private readonly logger: LoggerService;
  private readonly discovery: DiscoveryService;
  private readonly auth: AuthService;

  static fromConfig(options: RoadmapCollatorFactoryOptions) {
    return new RoadmapCollatorFactory(options);
  }

  private constructor(options: RoadmapCollatorFactoryOptions) {
    this.logger = options.logger;
    this.discovery = options.discovery;
    this.auth = options.auth;
  }

  async getCollator() {
    return Readable.from(this.execute());
  }

  private async *execute(): AsyncGenerator<IndexableRoadmapDocument> {
    this.logger.info('Indexing roadmap features');

    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'roadmap',
    });
    const baseUrl = await this.discovery.getBaseUrl('roadmap');

    const response = await fetch(`${baseUrl}/features`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch roadmap features for indexing: ${response.status} ${response.statusText}`,
      );
    }
    const features: Feature[] = await response.json();

    this.logger.debug(`Indexing ${features.length} roadmap features`);

    for (const feature of features) {
      yield {
        title: feature.title,
        text: feature.description,
        location: `/roadmap?feature=${encodeURIComponent(feature.id)}`,
        status: feature.status,
        votes: feature.votes,
        author: feature.author,
      };
    }
  }
}
