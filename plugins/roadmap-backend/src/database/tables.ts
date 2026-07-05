import { Feature, Comment } from '@rothenbergt/backstage-plugin-roadmap-common';
import { statusFromDb } from './statusDbMapping';

/**
 * Raw row shapes as they come back from Knex (snake_case, driver-typed).
 * All reads must go through the mappers below so snake_case never leaks
 * into code typed against the camelCase API types.
 */
export type FeatureRow = {
  id: number | string;
  title: string;
  description: string;
  status: string;
  votes: number | string | null;
  author: string;
  created_at: string | Date;
  updated_at: string | Date;
  board_position: number | string | null;
};

export type CommentRow = {
  id: number | string;
  feature_id: number | string;
  text: string;
  author: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export type VoteRow = {
  id: number | string;
  feature_id: number | string;
  voter: string;
  created_at: string | Date;
  updated_at: string | Date;
};

/**
 * Normalizes driver-specific timestamps to ISO 8601 UTC, the API contract.
 * Postgres returns Date objects; sqlite returns `YYYY-MM-DD HH:MM:SS` strings
 * that are UTC but carry no timezone marker.
 */
export function toIsoUtc(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const trimmed = value.trim();
  // SQL datetime without timezone: interpret as UTC.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return new Date(`${trimmed.replace(' ', 'T')}Z`).toISOString();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function mapFeatureRow(row: FeatureRow): Feature {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    status: statusFromDb(row.status),
    votes: Number(row.votes ?? 0),
    author: row.author,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    boardPosition:
      row.board_position !== undefined && row.board_position !== null
        ? Number(row.board_position)
        : 0,
  };
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: String(row.id),
    featureId: String(row.feature_id),
    text: row.text,
    author: row.author,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}
