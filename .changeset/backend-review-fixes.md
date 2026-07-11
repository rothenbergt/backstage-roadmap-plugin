---
'@rothenbergt/backstage-plugin-roadmap-backend': patch
'@rothenbergt/backstage-plugin-roadmap': patch
---

Fixes from a code review pass, headlined by making the default install work out of the box:

- Any authenticated user can now suggest features when the permission framework is disabled, matching the documented behavior. Previously only users in `roadmap.adminUsers` could create features, so a fresh install rejected everyone else with 403.
- Boards without the signals plugin now catch up on other users' changes via window-focus refetching plus a 5 minute polling fallback, instead of staying stale indefinitely.
- Vote optimistic updates now target the board's actual query cache, so votes update instantly again, and the vote button is disabled while a toggle is in flight to prevent double-click races.
- Reordering now updates the board optimistically, rolls back on failure, and shows an error toast instead of failing silently. The backend also re-positions features the client couldn't see (retention-hidden items) after the submitted ones, so partial reorders no longer collide.
- Moving a feature to another column now places it at the end of the destination column instead of keeping a position from the old column.
- New comments now appear at the top of the list immediately, matching the newest-first order the backend returns.
- API error toasts show the actual error message instead of a serialized JSON envelope.
- GitLab: features suggested through the plugin are now attributed to the real Backstage user via a hidden tag in the issue description, instead of the API token owner. New vote and comment markers store the full entity ref (namespaces are no longer collapsed), and legacy username-only markers are still read and cleaned up.
- GitLab: unvoting removes all of a user's vote markers, so duplicates from concurrent toggles no longer leave a stuck vote.
- GitLab: status changes report the marker-based vote count instead of falling back to GitLab's native upvotes (which briefly showed 0 in the UI).
- GitLab: toggling a vote invalidates the vote cache instead of caching its own snapshot, so concurrent votes can no longer serve a stale count for the cache TTL.
- Vote batch endpoints deduplicate ids and reject more than 250 ids per request; the frontend client chunks larger boards automatically.
- Feature edit and comment payloads are validated for string types, returning 400 instead of crashing with 500 on malformed JSON.
- Error codes now say what actually happened: GitLab outages and misconfiguration surface as 503 (was 403/409), operations the GitLab datasource doesn't support return 501 (was 403), and unexpected database failures return 500 (was 409).
