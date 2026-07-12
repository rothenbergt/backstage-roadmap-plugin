# @rothenbergt/backstage-plugin-roadmap

The frontend for the [Backstage Roadmap Plugin](https://github.com/rothenbergt/backstage-roadmap-plugin): a public roadmap board inside Backstage where your developers, the customers of your platform, can suggest features, vote on ideas, and comment. Your platform team shares what's coming, and feedback flows in right where everyone already works.

## Features

- Visual roadmap board with configurable columns
- Voting, comments, and a suggestion form
- Deep links: `/roadmap?feature=<id>` opens a feature's details drawer directly
- Live board updates via Backstage signals when installed (votes and status changes appear without a refresh)
- Admin actions (status changes, edits, reordering) gated by the permission framework or a config list

## Installation

```
yarn --cwd packages/app add @rothenbergt/backstage-plugin-roadmap
```

The plugin uses the new Backstage [frontend system](https://backstage.io/docs/frontend-system/) and is discovered automatically. No wiring needed; visit `/roadmap` in your app.

It talks to [`@rothenbergt/backstage-plugin-roadmap-backend`](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap-backend), which must be installed in your backend.

## Documentation

Setup, configuration (permissions, board columns, notifications, search, GitLab datasource), and screenshots live in the [main README](https://github.com/rothenbergt/backstage-roadmap-plugin#readme).

## Local development

Run `yarn dev` at the repository root for a full dev environment (frontend, backend, catalog, notifications, signals, and search), or `yarn start` in this directory to serve the plugin in isolation using the setup in [/dev](./dev).
