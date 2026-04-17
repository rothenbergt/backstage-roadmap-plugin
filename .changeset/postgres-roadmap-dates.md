---
'@rothenbergt/backstage-plugin-roadmap': patch
---

**Patch (non-breaking):** Fix roadmap feature date display when the API returns ISO 8601 timestamps from PostgreSQL (`pg`). The UI previously appended `Z` unconditionally, which broke ISO strings and showed "Invalid Date". Legacy SQL-style UTC strings (`YYYY-MM-DD HH:MM:SS`) remain supported; public exports and behavior are otherwise unchanged.
