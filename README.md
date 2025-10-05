# 🗺️ Backstage Roadmap Plugin

[![npm version](https://img.shields.io/npm/v/@rothenbergt/backstage-plugin-roadmap?label=roadmap)](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap)
[![npm version](https://img.shields.io/npm/v/@rothenbergt/backstage-plugin-roadmap-backend?label=roadmap-backend)](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap-backend)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Backstage](https://img.shields.io/badge/Backstage-1.43.3-brightgreen.svg)](https://backstage.io)
[![Node](https://img.shields.io/badge/node-18%20%7C%2020%20%7C%2022-blue.svg)](https://nodejs.org)

## 🌟 Overview

The Backstage Roadmap Plugin takes roadmaps out of hidden places like Confluence and puts them front and center. Teams can share what’s coming up, while users get to chime in by suggesting features, voting on ideas, and adding comments. It’s all about creating a space where feedback flows easily, and everyone helps shape the future of the platform together.

🚀 **Note:** This plugin requires you to use the new Backstage backend system.

## 📸 Screenshots

### Main Dashboard

![Main Dashboard](./assets/MainDashboard.png)

### Feature Details

![Feature Details Drawer](./assets/FeatureDetailsDrawer.png)

### Suggest New Feature

![Suggestion Drawer](./assets/SuggestionDrawer.png)

## ✨ Features

- 📊 Visual roadmap board
- 🗳️ Voting system
- 💬 Comment section for each feature
- 🔐 Role-based permissions (admin vs. regular user)
- 🆕 Feature suggestion form for users

## 🛠️ Installation

1. Install the plugin in your Backstage instance:

   ```
   yarn add @rothenbergt/backstage-plugin-roadmap-backend --cwd packages/backend
   yarn add @rothenbergt/backstage-plugin-roadmap --cwd packages/app
   ```

2. Add the plugin to your `packages/backend/src/index.ts`:

   ```typescript
   // ...
   backend.add(import('@rothenbergt/backstage-plugin-roadmap-backend'));
   ```

3. Add the frontend plugin to your `packages/app/src/App.tsx`:
   ```typescript
   import { RoadmapPage } from '@rothenbergt/backstage-plugin-roadmap';
   // ...
   <FlatRoutes>
     {/* ... */}
     <Route path="/roadmap" element={<RoadmapPage />} />
   </FlatRoutes>;
   ```

## 🖥️ Usage

After installation, navigate to the `/roadmap` route in your Backstage instance. From there, you can:

- View the current roadmap
- Vote on features
- Suggest new features
- Comment on existing features
- (Admins) Manage feature statuses

## ⚙️ Configuration

If you aren't utilizing the Backstage permission framework, add the following to your `app-config.yaml` to enable the Admin Functions for specific users:

```yaml
roadmap:
  adminUsers:
    - user:default/admin1
    - user:default/admin2
```

## 🤝 Contributing

We welcome contributions!
