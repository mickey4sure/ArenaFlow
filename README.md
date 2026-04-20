<div align="center">

# ⚡ ArenaFlow

**Real-time AI-powered venue intelligence dashboard**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Google Cloud Run](https://img.shields.io/badge/Cloud_Run-Deployed-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-8E75B2?logo=google)](https://ai.google.dev)

[Live Demo]() · [Report a Bug](https://github.com/mickey4sure/ArenaFLow.git) · [Request a Feature](https://github.com/mickey4sure/ArenaFLow.git)

</div>

---

## 📖 Overview

**ArenaFlow** is a live venue-intelligence dashboard built for arena attendees. It combines real-time crowd data, an AI assistant (Scout), and an interactive Google Maps visualization into a single 3-panel experience — helping fans make smarter decisions inside a stadium: shorter food lines, cleaner restrooms, optimal exit routes, and live transit updates.

### Dashboard Preview

| Panel | Description |
|---|---|
| **Left — Real-Time Coordination** | Live wait times for concessions, restrooms, transit, and merch. Attendance and signal metrics refresh every 5 seconds. |
| **Center — Scout Intelligence** | Conversational AI powered by Gemini 2.5 Flash. Ask anything about the venue and get context-aware, structured responses. |
| **Right — Crowd Movement** | Google Maps with crowd heatmap overlay, walking directions to Scout-recommended locations, and a radar fallback when the Maps API key is absent. |

---

## ✨ Features

- 🤖 **Scout AI** — Gemini 2.5 Flash with model fallback chain (2.5-flash → flash-latest → 2.0-flash) and schema-enforced JSON responses
- 📍 **Live Map** — Google Maps JavaScript API with `HeatmapLayer`, walking `DirectionsRenderer`, and custom SVG markers
- 📊 **Live Venue Stats** — Attendance, capacity %, signals/minute, and per-item wait times; polled every 5 s
- 🚄 **Transit Intelligence** — Real-time metro train countdowns and Uber surge multiplier
- 🌑 **Dark-first design** — Custom dark theme with Tailwind CSS v4, smooth animations, glassmorphism accents
- 🚀 **Cloud Run ready** — Multi-stage Docker image with standalone Next.js output (~150 MB), Cloud Build CI/CD pipeline, and Secret Manager integration

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (custom dark theme) |
| AI | Google Gemini 2.5 Flash via `@google/generative-ai` |
| Maps | Google Maps JS API via `@react-google-maps/api` |
| Animations | Framer Motion |
| Icons | Lucide React |
| Font | Inter (Google Fonts) |
| Container | Docker (multi-stage, node:20-alpine) |
| CI/CD | Google Cloud Build |
| Hosting | Google Cloud Run |
| Secrets | Google Secret Manager |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **Gemini API key** — [Get one free](https://aistudio.google.com/app/apikey)
- *(Optional)* A **Google Maps API key** — [Enable Maps JS API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)

### 1 — Clone & Install

```bash
git clone https://github.com/mickey4sure/ArenaFLow.git
cd ArenaFlow
npm install
```

### 2 — Configure Environment

Create a `.env.local` file in the project root:

```env
# Required — Gemini AI (server-side only, never exposed to browser)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — Google Maps (public, safe to expose)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key_here
```

> **Note:** Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` the dashboard falls back to an animated radar UI. Scout AI and all live stats still work normally.

### 3 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
arenaflow/
├── src/
│   └── app/
│       ├── api/
│       │   └── scout/
│       │       └── route.ts      # Scout AI + live venue data API
│       ├── globals.css           # Design tokens & custom utilities
│       ├── layout.tsx            # Root layout, font, metadata
│       └── page.tsx              # Main dashboard (3-panel layout)
├── public/                       # Static assets
├── Dockerfile                    # Multi-stage production image
├── .dockerignore
├── cloudbuild.yaml               # Cloud Build CI/CD pipeline
├── next.config.ts                # standalone output for Docker
├── tailwind.config.ts
└── .env.local                    # ← create this (not committed)
```

---

## 🐳 Docker

### Build & Run Locally

```bash
# Build
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_maps_key" \
  -t arenaflow:local .

# Run
docker run -p 3000:8080 \
  -e GEMINI_API_KEY="your_gemini_key" \
  arenaflow:local

# Visit http://localhost:3000
```

The image uses **three stages**:

| Stage | Base | Purpose |
|---|---|---|
| `deps` | `node:20-alpine` | Install production deps only |
| `builder` | `node:20-alpine` | Full build with `next build` |
| `runner` | `node:20-alpine` | Minimal runtime (~150 MB) using Next.js standalone output |

---

## ☁️ Cloud Run Deployment

### One-time Setup

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=europe-west1

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

# Create image repository
gcloud artifacts repositories create arenaflow \
  --repository-format=docker --location=$REGION

# Store secret (never baked into the image)
echo -n "your_gemini_key" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

### Deploy via Cloud Build

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=\
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_maps_key",\
_REGION=$REGION
```

### Environment Variables on Cloud Run

| Variable | Storage | Injection |
|---|---|---|
| `GEMINI_API_KEY` | Secret Manager | `--set-secrets` (runtime) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Cloud Build substitution | `--build-arg` (build time) |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide including GitHub trigger setup, rollback commands, and log tailing.

---

## 🔌 API Reference

### `GET /api/scout`

Returns a snapshot of live venue data (randomised mock).

**Response:**
```json
{
  "concessions": [{ "id": "c1", "name": "Shake Shack", "waitTimeMinutes": 4, "status": "Open" }],
  "restrooms": [{ "id": "r1", "location": "Sec 110 Restrooms", "queueLength": 0 }],
  "transit": {
    "uberSurgeMultiplier": "1.8",
    "metro": [{ "line": "A/C/E Train", "direction": "Downtown", "nextTrainMinutes": 3 }]
  },
  "merch": { "location": "Team Store (Lvl 4)", "waitTimeMinutes": 6 },
  "stats": { "attendance": 19831, "capacity": "98.7", "signalsPerMinute": "4.3" }
}
```

---

### `POST /api/scout`

Send a chat message to Scout AI.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Where's the shortest food line?" }
  ]
}
```

**Response:**
```json
{
  "message": "Shake Shack at Gate A has only a 4-minute wait right now — fastest option on the concourse.",
  "action_taken": "Checked Wait Times",
  "map_location": { "lat": 40.7505, "lng": -73.9934, "label": "Shake Shack — Gate A" },
  "_liveData": { "...": "full venue snapshot" }
}
```

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Invalid or missing `messages` array |
| `503` | All Gemini models in the fallback chain failed |
| `500` | Unexpected server error |

---

## 📜 Available Scripts

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## 🗺️ Roadmap

- [ ] Zod request validation on the API route
- [ ] Per-IP rate limiting
- [ ] `aria-live` chat accessibility + WCAG AA compliance pass
- [ ] Jest unit & component test suite
- [ ] Real venue data integration (Ticketmaster / AXS APIs)
- [ ] WebSocket streaming for Scout responses
- [ ] Multi-venue support

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

---

<div align="center">

Built with ❤️ on Google Cloud · Gemini 2.5 Flash · Google Maps JavaScript API

</div>
