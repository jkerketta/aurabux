# ABX - Aurabux

```
──────────────────────────────────────
 ₍₍⚞(˶^ ᗜ ^˶)⚟⁾⁾  Aurabux ver. 1.0
──────────────────────────────────────
```

<img width="1043" height="595" alt="image" src="https://github.com/user-attachments/assets/66980d54-fc92-4946-92d4-8e4a53ce764d" />

A stock trading game where you use a fake digital currency called Aurabux (ABX) to pick real stocks, compete with friends, and try to grow your portfolio.

## About

ABX gives every player **10,000 ABX** to start trading real stocks with fake money. Track your portfolio, compete on a live leaderboard, spin daily for rewards, and challenge friends to see who makes the best investments. Built for learning, fun, and friendly rivalry.

## Features

- **Auth** -- sign up with email/password or Google OAuth, one-click sign-in.  
  <small>Supabase Auth · JWT · middleware-protected routes</small>

- **Portfolio** -- start with 10,000 ABX, buy and sell real stocks with live prices.  
  <small>Real-time quotes · position tracking · daily return % · total invested</small>

- **Daily Spinner** -- spin once a day for ABX bonuses, free stocks, or x2 return powerups.  
  <small>Cooldown tracking · random rewards · powerup activation + claim flow</small>

- **Leaderboard** -- global ranking by portfolio value, sorted by return %.  
  <small>Live prices · all-time performance · compare with other players</small>

- **Social** -- add friends, view their portfolios, compete head-to-head.  
  <small>Friend requests · accept/decline · view holdings</small>

- **Onboarding** -- guided walkthrough for first-time users.  
  <small>Modal slides · dismiss per session · tracks has_seen_onboarding</small>


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide icons |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (auto-deploy from Git) |
| Market Data | Finnhub API (live stock quotes) |

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Finnhub](https://finnhub.io) API key (free tier works)
- A [Vercel](https://vercel.com) account (optional, for deployment)

### Clone & Install

```bash
git clone https://github.com/jkerketta/ABX-Aurabux.git
cd ABX-Aurabux
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Fill in your Supabase and Finnhub credentials in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FINNHUB_API_KEY=your_finnhub_key
```

### Database Setup

Run the migrations in order in the Supabase SQL Editor:

```
001_initial_schema.sql → 002_holdings_and_transactions.sql → 004 → 005 → ... → 016
```

Then deploy the code and run post-deploy migrations:

```
018_remove_client_writes.sql → 019_add_check_constraints.sql → 020 → 021
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

```bash
npx vercel --prod
```

Or connect the GitHub repo to Vercel for auto-deploy on push to `main`.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── stocks/          # buy, sell, quote, search, holdings
│   │   ├── spin/            # daily spinner (spin, activate, claim)
│   │   ├── friends/         # request, accept, decline, list
│   │   └── auth/            # email confirmation callback
│   ├── auth/
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   │   ├── leaderboard/
│   │   ├── search/
│   │   └── stock/[symbol]/
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn primitives
│   ├── layout/              # Navbar
│   ├── spinner/             # Wheel, claim, info
│   ├── onboarding/          # First-time modal
│   └── transactions/        # History table
├── lib/
│   ├── supabase/            # client, server, admin
│   ├── spin.ts              # Spin status logic
│   └── cache.ts             # In-memory price cache
└── middleware.ts            # Auth + route protection
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `FINNHUB_API_KEY` | Yes | Finnhub API key for live stock quotes |

## Security

- **Row Level Security (RLS)** -- all tables are RLS-enabled. Users can only read/update their own data.
- **Service role for writes** -- all buy/sell/spin operations go through a server-side admin client that bypasses RLS. Never exposed to the browser.
- **Optimistic locking** -- balance updates use `.eq("current_balance", currentBalance)` to prevent race conditions. If the balance changed between read and write, the transaction fails with 409.
- **CHECK constraints** -- database-level guards preventing negative balance, negative shares, etc.
- **Server-side price verification** -- trade execution verifies stock price against a cached quote (30s TTL, 5% tolerance). Rejects client-submitted prices.
- **Double-submit protection** -- trade confirmation button disables and shows spinner during execution.
- **Unique indexes** -- prevent double-spin and double-powerup-activation at the database level.
- **Open redirect protection** -- email confirmation validates redirect URLs to prevent phishing.

## License

MIT License. See [LICENSE](LICENSE) for details.
