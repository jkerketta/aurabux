# Aurabux

A fake stock trading game where you pick real stocks, compete with friends, and try to grow your portfolio.

## About

Aurabux gives every player **10,000 ABX** to start trading real stocks with fake money. Track your portfolio, compete on a live leaderboard, spin daily for rewards, and challenge friends to see who makes the best investments. Built for learning, fun, and friendly rivalry.

## Features

- **Portfolio Dashboard** — Real-time balance, holdings, and all-time return tracking
- **Live Stock Data** — Real-time quotes, interactive charts (1D/1M/1Y/5Y), and company info
- **Buy & Sell** — Trade by shares or ABX amount with instant balance updates
- **Daily Spin** — CSGO-style spinner with 8 rewards: ABX, free stocks, x2 returns, free spins
- **x2 Powerup** — Snapshot your portfolio, wait 24h, and claim doubled returns
- **Global Leaderboard** — Live rankings with real-time price calculations
- **Friends System** — Send requests, accept/decline, and compete with your circle
- **Skeleton Loading** — Shimmer animations on all page transitions

## Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel)](https://vercel.com/)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/jkerketta/ABX-Aurabux.git
cd ABX-Aurabux
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) below for details.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `FINNHUB_API_KEY` | Finnhub API key for stock data (free at [finnhub.io](https://finnhub.io)) |

## Screenshots

Coming soon.

## License

MIT
