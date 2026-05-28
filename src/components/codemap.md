# src/components/

## Responsibility
Provides all reusable UI primitives and domain-specific interactive components for the ABX Aurabux application. Organized into four subdirectories:

| Directory | Purpose |
|---|---|
| `ui/` | shadcn/ui primitives — unstyled building blocks (button, card, dialog, input, etc.) |
| `spinner/` | Daily spin game mechanics — slot-machine animation, reward claiming, x2 powerup lifecycle, spin info modal |
| `friends/` | Social features — friend search, request send/accept/decline/cancel, friend list management |
| `layout/` | Application shell — top navigation bar with user menu and route links |
| `trade/` | Trade confirmation dialog — buy/sell summary with cost basis and gain/loss display |

## Design Patterns

### shadcn/ui Primitives (`ui/`)
All UI primitives follow the shadcn/ui "new-york" style convention:

- **Class merging**: Every component uses `cn()` (from `@/lib/utils`) to merge Tailwind utility classes with user-supplied `className` props. `cn()` composes `clsx` + `tailwind-merge` for conflict-free class resolution.
- **Variant system**: `Button` and `Badge` use `class-variance-authority` (CVA) to define typed variant matrices (`variant`, `size`) with `defaultVariants`. Consumers pass variant props that resolve to precomposed Tailwind class strings.
- **`React.forwardRef`**: `Card` (all sub-components), `Button`, `Input`, and `Separator` forward refs to the underlying DOM element, enabling imperative access (focus, measurement) from parent components.
- **Radix UI composition**: `Dialog`, `DropdownMenu`, and `Tabs` are thin wrappers around `radix-ui` primitives (new `radix-ui` monolithic package, except `Separator` which uses `@radix-ui/react-separator`). Each wrapper adds `data-slot` attributes for CSS targeting and Tailwind CSS v4 `cn()`-merged default styles (open/close animations, positioning, focus rings).
- **`Slot` composition**: `Button` supports `asChild` via `@radix-ui/react-slot`, allowing consumers to render the button styles on any element (e.g., `<Button asChild><Link>...</Link></Button>`).
- **Skeleton animation**: `Skeleton` uses inline `style` with a CSS `linear-gradient` and references the `shimmer` keyframe animation defined in `src/app/globals.css`. CSS custom properties `--color-skeleton` and `--color-skeleton-highlight` drive the gradient colors.

### Custom Interactive Components (`spinner/`, `friends/`, `layout/`)

- **Controlled dialog pattern**: All modals (`SpinModal`, `X2ClaimModal`, `FriendsModal`) are controlled components — `open` boolean and `onOpenChange` callback are passed from the parent. The modal never manages its own open state.
- **Framer Motion animations**: `SpinModal` uses `useAnimationControls()` for imperative animation of the slot-machine strip. The strip is a `motion.div` with `willChange: "transform"` for GPU-composited rendering. Animation uses a custom cubic-bezier easing `[0.15, 0.85, 0.35, 1]` for deceleration.
- **Strip-based slot machine**: `SpinModal` builds a 60-element reward strip via `buildStrip()`, placing the winning reward at index 50 (`STRIP_LENGTH - 10`). The viewport calculates a target `x` offset that centers the winning card with a random ±64px jitter for natural feel.
- **API-driven state**: `SpinModal`, `X2ClaimModal`, and `FriendsModal` all use `fetch()` to call Next.js route handlers (`/api/spin`, `/api/spin/claim`, `/api/spin/activate`, `/api/friends`, etc.). Loading states are tracked via `useState` booleans (`spinning`, `claiming`, `loading`, `actionLoading`).
- **Ref-based guard**: `SpinModal` uses a `useRef<boolean>` (`spinningRef`) alongside state to prevent double-invocation of the spin handler during async operations.
- **Countdown timer**: `SpinModal` uses `setInterval` with a `setTick` state updater to force re-renders every second, computing `countdownText` directly from `nextResetAt` on each render (no stale closure risk).
- **Tabbed UI composition**: `FriendsModal` composes `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` from `ui/tabs` to split the friends list and requests views. The "Requests" trigger renders a `Badge` with the incoming request count.
- **Inline render helper**: `FriendsModal` uses an inline `renderUserRow()` function that returns JSX for consistent user row layout across friends/incoming/outgoing lists.
- **Navbar composition**: `Navbar` is a client component that composes `DropdownMenu` (user actions) and `FriendsModal` (social). It receives `User`, `username`, and `displayNumber` as props from the server-side layout.

## Data & Control Flow

### Props Flow
```
Server Component (layout/page)
  │
  ├── passes user data ──→ Navbar (client) ──→ DropdownMenu ──→ FriendsModal
  │                                                    │
  │                                                    └──→ Dialog (Radix)
  │
  └── passes spin state ──→ SpinModal (client) ──→ Dialog + motion strip
  │
  └── passes claim state ──→ X2ClaimModal (client) ──→ Dialog
```

### Event Emission
- **Modal open/close**: All modals emit `onOpenChange(open: boolean)` to the parent, which controls the `open` prop.
- **Spin completion**: `SpinModal` emits `onSpinComplete()` after a successful spin API call and animation, signaling the parent to refetch spin state.
- **Claim completion**: `X2ClaimModal` emits `onClaimComplete()` after the `/api/spin/claim` POST succeeds.
- **Friend actions**: `FriendsModal` internally manages all friend CRUD operations (send, accept, decline, remove, cancel) and refetches the full friends list via `fetchFriends()` after each mutation.
- **Logout**: `Navbar` calls `supabase.auth.signOut()` via the browser client, then performs a hard navigation (`window.location.href = "/login"`) to clear all client state.

### State Management
- **Local state only**: All components use React `useState`/`useEffect`/`useCallback`/`useRef` — no global state management (no Context, Zustand, Redux).
- **Server data via API routes**: Components fetch from Next.js route handlers (`/api/*`), which in turn use Supabase server/admin clients. No direct Supabase calls from client components except `Navbar` logout.
- **Optimistic UI**: None — all mutations wait for server confirmation before updating local state.

## Integration Points

| Dependency | Used By | Purpose |
|---|---|---|
| `@/lib/utils` (`cn`) | All components | Class merging with `clsx` + `tailwind-merge` |
| `radix-ui` | `dialog.tsx`, `dropdown-menu.tsx`, `tabs.tsx` | Accessible dialog, dropdown, and tab primitives |
| `@radix-ui/react-separator` | `separator.tsx` | Accessible visual separator primitive |
| `@radix-ui/react-slot` | `button.tsx` | `asChild` polymorphic component rendering |
| `class-variance-authority` | `button.tsx`, `badge.tsx`, `tabs.tsx` | Typed variant class composition |
| `framer-motion` | `spin-modal.tsx` | Slot-machine strip animation via `useAnimationControls` |
| `lucide-react` | All interactive components | Icon library (RotateCw, Loader2, Users, Zap, etc.) |
| `sonner` | `spin-modal.tsx`, `x2-claim-modal.tsx`, `friends-modal.tsx` | Toast notifications for success/error/info feedback |
| `@/lib/supabase/client` | `navbar.tsx` | Browser Supabase client for sign-out |
| Tailwind CSS v4 | All components | Utility-first styling with CSS custom properties (`--color-skeleton`, `--color-skeleton-highlight`) and `@keyframes shimmer` (defined in `src/app/globals.css`) |
| Next.js `Link` | `navbar.tsx` | Client-side navigation for Portfolio, Search, Leaderboard routes |

## Component Inventory

### `ui/` — shadcn/ui Primitives

| Component | Type | Key Features |
|---|---|---|
| `Button` | Client-capable | CVA variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), sizes (`default`, `sm`, `lg`, `icon`), `asChild` via Slot |
| `Card` | Server-safe | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` — all forwardRef |
| `Dialog` | Client | Radix wrapper with `data-slot` attrs, `showCloseButton` prop on `DialogContent`, animated overlay/content |
| `DropdownMenu` | Client | Full Radix dropdown suite: trigger, content, items (default/destructive), checkbox/radio items, sub-menus, separator, shortcut |
| `Tabs` | Client | Horizontal/vertical orientation, `default`/`line` variant for `TabsList`, active indicator via `::after` pseudo-element |
| `Input` | Server-safe | ForwardRef `<input>` with focus-visible ring, disabled states, file input support |
| `Badge` | Server-safe | CVA variants (`default`, `secondary`, `destructive`, `outline`) |
| `Skeleton` | Server-safe | Shimmer animation via inline gradient + `shimmer` keyframe from `globals.css` |
| `Separator` | Client | Radix separator, horizontal (1px height) or vertical (1px width), decorative by default |

### `spinner/` — Daily Spin Game

| Component | Type | Key Features |
|---|---|---|
| `SpinModal` | Client | Slot-machine animation, 8 reward types (ABX, stock, x2 powerup, free spins), cooldown countdown, x2 accept/reject flow |
| `X2ClaimModal` | Client | Post-powerup claim flow, snapshot vs. current value comparison, doubled gain/loss display with color-coded results |
| `SpinInfoModal` | Client | Rewards explainer dialog — lists all 8 reward types with icons and descriptions, triggered by `?` icon on dashboard |

### `friends/` — Social Features

| Component | Type | Key Features |
|---|---|---|
| `FriendsModal` | Client | Tabbed UI (Friends/Requests), username#NNN format validation, send/accept/decline/cancel/remove actions, incoming request badge count |

### `layout/` — Application Shell

| Component | Type | Key Features |
|---|---|---|
| `Navbar` | Client | Three-section layout (logo left, nav links center, user menu right), dropdown with Friends + Sign Out, hard-redirect logout |

### `trade/` — Trade Confirmation

| Component | Type | Key Features |
|---|---|---|
| `TradeConfirmation` | Client | Buy/sell confirmation dialog — shows trade summary, remaining balance (buy), or cost basis + gain/loss (sell), prevents accidental trades |
