# ABX - Aurabux

A stock trading game where you use a fake digital currency called Aurabux (ABX) to pick real stocks, compete with friends, and try to grow your portfolio.

## About

ABX gives every player **10,000 ABX** to start trading real stocks with fake money. Track your portfolio, compete on a live leaderboard, spin daily for rewards, and challenge friends to see who makes the best investments. Built for learning, fun, and friendly rivalry.

## Features

- **Portfolio Dashboard** — Real-time balance, holdings, total P&L, and all-time return tracking
- **Live Stock Data** — Real-time quotes, interactive charts (1D/1M/1Y/5Y), market status, and company info
- **Buy & Sell** — Trade by shares or ABX amount with confirmation dialogs and instant balance updates
- **Daily Spin** — CSGO-style spinner with 8 rewards: ABX, free stocks, x2 returns, free spins
- **x2 Powerup** — Snapshot your portfolio, wait 24h, and claim doubled returns
- **Global Leaderboard** — Live rankings with real-time price calculations
- **Friends System** — Send requests, accept/decline, and compete with your circle


## Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Recharts](https://img.shields.io/badge/Recharts-Charts-FF7300?logo=apacheecharts)](https://recharts.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-0055FF?logo=framer)](https://www.framer.com/motion/)

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

## Live Demo

[Deploy on Vercel](https://vercel.com/new) — One-click deploy with environment variables.

## Screenshots
<img width="1060" height="578" alt="image" src="https://github.com/user-attachments/assets/ba9f47c4-049d-4cc8-87bc-1f5a4cddbbaa" />
<img width="1196" height="1040" alt="image" src="https://github.com/user-attachments/assets/e8675884-4406-4565-aff2-f8d0bb57654d" />
<img width="920" height="1229" alt="image" src="https://github.com/user-attachments/assets/580623d6-65e7-46ed-bda3-489ea019012b" />


## License

MIT
