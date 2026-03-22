# Coddy Frontend

> React frontend for the Coddy AI website generator — chat with an LLM, watch your site get built in real time.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)

**Backend repo:** [coddy](https://github.com/yrris/coddy)

---

## Features

- **Chat-based code generation** — Conversational interface backed by SSE streaming for real-time LLM output
- **Live preview** — Iframe preview of generated HTML sites with cache-busting refresh
- **Markdown rendering** — AI responses displayed with syntax-highlighted code blocks (Prism.js)
- **Auth** — Email/password login, Google OAuth 2.0, session-based with role awareness
- **App management** — Create, edit, delete, and deploy projects from the dashboard
- **Admin panel** — Manage all apps, users, and chat history (admin role only)
- **Cursor-based chat history** — Load older messages on scroll with efficient pagination

## Tech Stack

| Layer         | Technology                                |
| ------------- | ----------------------------------------- |
| UI Framework  | React 19                                  |
| Language      | TypeScript 5.7                            |
| Build Tool    | Vite 6                                    |
| Data Fetching | TanStack React Query 5                    |
| Routing       | React Router 6                            |
| Streaming     | EventSource (SSE)                         |
| Markdown      | react-markdown + react-syntax-highlighter |
| Styling       | Custom CSS (dark theme, CSS variables)    |

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8765` (see [backend repo](https://github.com/yrris/coddy))

### Setup

```bash
npm install
cp .env.example .env.local   # optional — defaults work for local dev
npm run dev
```

App runs at `http://localhost:5173`

Vite proxies `/api` requests to the backend automatically.

### Build

```bash
npm run typecheck
npm run build
npm run preview
```

<!-- ### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8765/api` | Backend API base URL |
| `VITE_DEPLOY_DOMAIN` | `http://localhost` | Domain for deployed site previews |
| `VITE_GOOGLE_AUTH_ENABLED` | `true` | Show Google login button |

## Screenshots -->

<!-- Add your own screenshots or GIFs here -->

<!-- | Home / Create | Chat & Streaming | Preview |
|:-:|:-:|:-:|
| *screenshot here* | *screenshot here* | *screenshot here* | -->

<!-- ## License

MIT -->
