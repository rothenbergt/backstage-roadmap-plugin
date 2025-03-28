# Backstage Roadmap Plugin

A Backstage plugin that provides a public roadmap interface for your platform, allowing users to suggest features, vote on ideas, and track progress.

## Overview

The Roadmap Plugin takes roadmaps out of hidden places like Confluence and puts them front and center within your Backstage instance. Teams can share what's coming up, while users get to participate by suggesting features, voting on ideas, and adding comments. It creates a collaborative space where feedback flows easily, and everyone helps shape the future of the platform together.

## Plugin Structure

This plugin is organized into three packages:

- **roadmap**: Frontend React components and API client
- **roadmap-backend**: Backend API with service and database layers
- **roadmap-common**: Shared types and utilities used by both frontend and backend

## Key Features

- 📊 Visual roadmap board with customizable columns
- 🗳️ Voting system for features with real-time updates
- 💬 Comment section for each feature suggestion
- 🔐 Role-based permissions (admin vs. regular user)
- 🆕 Feature suggestion form for users

## Architecture

### Frontend

- Uses React hooks for state management
- Communicates with backend via API client
- Features responsive UI components

### Backend

- Layered architecture (routes → services → database)
- RESTful API endpoints
- Transactional database operations
- Consistent error handling using Backstage error patterns

## Development

See individual package READMEs for more detailed information:

- [Frontend](./roadmap/README.md)
- [Backend](./roadmap-backend/README.md)
- [Common](./roadmap-common/README.md)

## Screenshots

Check the main [README.md](../README.md) for screenshots.
