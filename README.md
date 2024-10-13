# 🗺️ Backstage Roadmap Plugin

## 🌟 Overview

The Backstage Roadmap Plugin is a powerful tool designed to help teams manage and visualize their product roadmap directly within Backstage. It provides an interactive interface for tracking features, gathering user feedback, and keeping everyone aligned on the product's direction.

🚀 **Note:** This plugin requires you to use the new Backstage backend system.

## 📸 Screenshots

### Main Dashboard

![Main Dashboard](./assets/MainDashboard.png)

### Feature Details

[Insert screenshot of the feature details view here]

### Suggest New Feature

[Insert screenshot of the feature suggestion form here]

## ✨ Features

- 📊 Visual roadmap board
- 🗳️ Voting system
- 💬 Comment section for each feature
- 🔐 Role-based permissions (admin vs. regular user)
- 🆕 Feature suggestion form for users

## 🛠️ Installation

🚀 **Note:** This plugin is still in active development and is not yet on NPM

1. Install the plugin in your Backstage instance:

   ```
   yarn add --cwd packages/backend @rothenbergt/backstage-plugin-roadmap-backend
   yarn add --cwd packages/app @rothenbergt/backstage-plugin-roadmap
   ```

2. Add the plugin to your `packages/backend/src/index.ts`:

   ```typescript
   import roadmap from ;
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
