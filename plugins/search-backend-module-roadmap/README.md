# @rothenbergt/backstage-plugin-search-backend-module-roadmap

A search backend module that indexes roadmap features from
[`@rothenbergt/backstage-plugin-roadmap-backend`](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap-backend)
into Backstage global search. Searching for a feature title or description
takes you straight to that feature's details drawer on the roadmap board.

## Installation

```
yarn --cwd packages/backend add @rothenbergt/backstage-plugin-search-backend-module-roadmap
```

Add the module to your `packages/backend/src/index.ts`:

```typescript
backend.add(import('@backstage/plugin-search-backend'));
backend.add(
  import('@rothenbergt/backstage-plugin-search-backend-module-roadmap'),
);
```

The roadmap backend plugin must also be installed.

## Configuration

The collator runs every 10 minutes by default. Override the schedule in
`app-config.yaml` if you like:

```yaml
search:
  collators:
    roadmap:
      schedule:
        frequency: { minutes: 30 }
        timeout: { minutes: 5 }
        initialDelay: { seconds: 10 }
```
