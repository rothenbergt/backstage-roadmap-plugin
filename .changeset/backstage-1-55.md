---
'@rothenbergt/backstage-plugin-roadmap': patch
'@rothenbergt/backstage-plugin-roadmap-backend': patch
'@rothenbergt/backstage-plugin-roadmap-common': patch
'@rothenbergt/backstage-plugin-search-backend-module-roadmap': patch
---

Upgraded Backstage dependencies from the 1.52.1 release line to 1.55.3. No plugin API changes; the new frontend system extensions (`PageBlueprint`, `ApiBlueprint`, `SearchResultListItemBlueprint`) and the backend `config.d.ts` schemas were checked against the 1.53–1.55 breaking changes, including the stricter config loader and `@backstage/plugin-catalog-backend` 4.0.
