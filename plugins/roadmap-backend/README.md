# Backstage Roadmap Plugin Backend

This is the backend part of the Roadmap Plugin for Backstage, providing API endpoints to manage a public product roadmap with features, voting, and comments.

## Architecture

This plugin follows a layered architecture with clear separation of concerns:

### 1. Database Layer

- **RoadmapDatabaseClient**: Handles direct database operations through Knex
- Uses transactions for all write operations to ensure data consistency
- Maps database errors to Backstage's error types for consistent error handling

### 2. Service Layer

- Implements business logic and validation rules
- Services include:
  - **FeatureService**: Feature management and validation
  - **CommentService**: Comment creation and retrieval
  - **VoteService**: Vote toggling and counting
  - **PermissionService**: Authorization and permission checks

### 3. Route Layer

- RESTful API endpoints that connect to frontend
- Routes include:
  - `/features`: CRUD operations for roadmap items
  - `/comments`: Add and retrieve comments for features
  - `/votes`: Toggle votes and get vote counts
  - `/permissions`: Check user permissions

### 4. Error Handling

- Uses Backstage's built-in error types and middleware
- Errors bubble up through layers and are handled centrally
- Provides consistent error responses with appropriate HTTP status codes

## API Endpoints

### Features

- `GET /features/board-config`: Resolved board columns (labels, visibility, retention settings) and UI capability flags for the active datasource.
- `GET /features`: Roadmap features for the board. With the **database** datasource, the list is filtered server-side using merged board config: hidden columns (`visible: false`) are omitted, and per-status **retention** hides stale items from this response. GitLab mode returns the existing issue list (no retention filtering added server-side).
- `GET /features?includeBeyondRetention=true`: **Database only.** Same column-visibility rules as the default list, but items past their retention window are included. Ignored when `roadmap.source` is `gitlab`.
- `POST /features`: Create a new feature suggestion
- `GET /features/:id`: Get a specific feature
- `PUT /features/:id/status`: Update feature status (admin only)
- `PUT /features/:id`: Update title and/or description (**database** only; admins always; non-admins only when they are the author and the feature is **Suggested**). Returns **403** for GitLab.
- `DELETE /features/:id`: Delete a feature (**database** only; admin, or author on **Suggested**). Returns **403** for GitLab.
- `PUT /features/reorder`: Reorder features within a status column (**database**, admin). Returns **403** for GitLab.

### Comments

- `GET /comments?featureId=123`: Get comments for a feature
- `POST /comments`: Add a comment to a feature
- `DELETE /comments/:commentId`: Delete a comment (**database**, admin). Returns **403** for GitLab.

### Votes

- `POST /votes/:featureId`: Toggle a vote on a feature
- `GET /votes/:featureId/count`: Get vote count for a feature
- `GET /votes/counts?ids=123,456`: Get vote counts for multiple features
- `GET /votes/:featureId/user`: Check if current user has voted

### Permissions

- `GET /permissions/check-admin`: Check if current user is an admin

## Development

### Board configuration (`app-config.yaml`)

Optional `roadmap.columns` merges with built-in defaults. Each entry may set:

- `status`: One of the `FeatureStatus` values (`Suggested`, `Planned`, `InProgress`, `Completed`, `Declined`).
- `title`: Column label shown in the UI.
- `visible`: When `false`, features in that status are omitted from list endpoints (default board keeps **In Progress** hidden).
- `retentionDays` / `retentionAnchor` (`created` | `updated`): **Database** list filtering only; default list excludes older items; `includeBeyondRetention=true` opts in to the full set (still respecting hidden columns).

### GitLab datasource freeze

When `roadmap.source` is `gitlab`, behavior stays limited to what the GitLab integration already supported: read/list, create feature and comment, voting, and admin status changes via labels. New capabilities (title/description edit, deletes, creator self-service edit/delete, reorder, retention and `includeBeyondRetention`) are **not** implemented for GitLab; related routes return **403 Not allowed** and the frontend hides those actions based on `GET /features/board-config` capabilities.

### Database Schema

The plugin sets up three main tables:

- **features**: Roadmap items with title, description, status, `board_position` (ordering within a status), etc.
- **comments**: User comments on features
- **votes**: User votes on features with unique constraint

### Permission Model

- Uses Backstage's permission framework
- Allows configuration of admin users through app-config.yaml
- Supports both config-based permissions and Backstage's permission framework

### Error Handling Strategy

This plugin follows Backstage's error handling patterns:

- `InputError`: For validation failures (400 errors)
- `NotFoundError`: When resources don't exist (404 errors)
- `NotAllowedError`: For authorization failures (403 errors)
- `ConflictError`: For database conflicts (409 errors)

Errors bubble up through layers to be handled by Backstage's middleware.
