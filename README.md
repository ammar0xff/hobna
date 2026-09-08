<div align="center">

# حبّنا — Hobna

**Your private couple's memory vault**

[![CI](https://github.com/ammar0xff/hobna/actions/workflows/ci.yml/badge.svg)](https://github.com/ammar0xff/hobna/actions/workflows/ci.yml)
[![Docker](https://github.com/ammar0xff/hobna/actions/workflows/docker.yml/badge.svg)](https://github.com/ammar0xff/hobna/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff6b6b.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](Dockerfile)

A cozy, self-hosted gallery for couples to store photos, videos, and moments —
with events, likes, comments, and full Arabic RTL support.

[Features](#features) · [Quick Start](#quick-start) · [Docker](#docker-deployment) · [API](#api)

</div>

---

## What is Hobna?

**Hobna** (حبّنا = "our love") is a private, self-hosted media gallery built for two.
Your own little corner of the internet to store and relive your best moments together.

- Upload and organize photos & videos
- Tag moments by person — ammar, alaa, or both
- Create events (trips, dates, milestones) and group media into them
- Like and comment on each other's uploads
- Browse by month, search, and filter

No cloud. No strangers. Just yours.

## Features

| Feature | Description |
|---------|-------------|
| **Media Gallery** | Upload images & videos with auto thumbnail generation via ffmpeg |
| **Smart Variants** | Original, medium, and thumbnail sizes auto-generated on upload |
| **Events** | Group photos/videos into events with covers and date ranges |
| **Person Tags** | Tag media by who's in it — ammar, alaa, or both |
| **Likes & Comments** | React to moments with likes and threaded comments |
| **Month Browser** | Jump to any month with a visual timeline |
| **Search** | Full-text search across captions and filenames |
| **Arabic RTL** | Fully Arabic-first interface with Cairo + Marhey fonts |
| **Auth** | Secure scrypt-hashed passwords with httpOnly session cookies |
| **Self-hosted** | SQLite + Next.js — runs on a Raspberry Pi or any VPS |
| **Docker** | One-command deployment with docker-compose |

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org) — App Router, Server Components
- **UI:** [Tailwind CSS 4](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev)
- **Database:** SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Media:** ffmpeg for thumbnail & video poster generation
- **Auth:** scrypt password hashing + cookie sessions
- **Fonts:** [Cairo](https://fonts.google.com/specimen/Cairo) + [Marhey](https://fonts.google.com/specimen/Marhey)

## Quick Start

### Prerequisites

- Node.js 20+
- ffmpeg
- npm

### Setup

```bash
git clone https://github.com/ammar0xff/hobna.git
cd hobna
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default users (set passwords via env vars):

| User | Default Password |
|------|-----------------|
| ammar | ammar1234 |
| alaa | alaa1234 |

> **Change these immediately in production!**

## Docker Deployment

### With Docker Compose (recommended)

```bash
git clone https://github.com/ammar0xff/hobna.git
cd hobna

# Set secure passwords
cat > .env << EOF
AMMAR_PASSWORD=your-secure-password-here
ALAA_PASSWORD=your-secure-password-here
EOF

docker compose up -d --build
```

App runs on `http://localhost:8789`.

### Standalone Docker

```bash
docker build -t hobna .
docker run -d \
  --name hobna \
  -p 8789:3000 \
  -e AMMAR_PASSWORD=changeme \
  -e ALAA_PASSWORD=changeme \
  -v hobna_data:/app/data \
  hobna:latest
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATA_DIR` | `./data` | Data directory for SQLite + media |
| `AMMAR_PASSWORD` | `ammar1234` | Initial password for ammar |
| `ALAA_PASSWORD` | `alaa1234` | Initial password for alaa |

## Project Structure

```
hobna/
├── app/
│   ├── (app)/              # Authenticated routes
│   │   ├── events/         # Event listing + detail
│   │   ├── settings/       # User settings
│   │   ├── layout.tsx      # App shell with header
│   │   └── page.tsx        # Home / library
│   ├── api/                # API routes
│   │   ├── assets/         # CRUD + likes + comments
│   │   ├── auth/           # Login / logout / me
│   │   ├── events/         # Event management
│   │   ├── media/          # Image/video serving
│   │   └── health/         # Health check
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout (RTL, fonts)
│   └── globals.css         # Tailwind + custom styles
├── components/             # React client components
├── lib/
│   ├── auth.ts             # Session & password utils
│   ├── db.ts               # SQLite setup & schema
│   ├── media.ts            # ffmpeg processing
│   ├── queries.ts          # Database queries
│   ├── types.ts            # TypeScript types
│   └── util.ts             # Date/size formatters
├── public/                 # Static assets
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Compose deployment
└── package.json
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Login (body: `{username, password}`) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/assets` | List assets (query: `type`, `person`, `search`, `yearMonth`, `eventId`) |
| `GET` | `/api/assets/:id` | Asset detail |
| `POST` | `/api/assets/:id/like` | Toggle like |
| `POST` | `/api/assets/:id/comments` | Add comment |
| `GET` | `/api/events` | List events |
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events/:id` | Event detail |
| `GET` | `/api/media/:id/:variant` | Serve media file |

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-thing`)
3. Commit (`git commit -m "feat: add amazing thing"`)
4. Push (`git push origin feat/amazing-thing`)
5. Open a Pull Request

## License

[MIT](LICENSE) — built with love by ammar & alaa
