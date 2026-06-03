# Security Hardening & Loading States Plan

**Branch:** `fix/mobile-and-bugs`
**Date:** 2026-06-03
**Status:** Ready to implement

---

## Overview

Pre-feature hardening pass: fix double-submit vulnerabilities, add missing loading states, verify server-side price checks, tighten RLS policies, and improve error handling. 18 microcommits total.

---

## Phase 1: Double-Submit & Loading States (9 commits)

### Commit 1
```
fix(trade): add confirming state to TradeConfirmation
```
**File:** `src/components/trade/trade-confirmation.tsx`
- Add `confirming` boolean prop
- When `confirming` is true: disable both Cancel and Confirm buttons
- Show `Loader2` spinner on Confirm button while `confirming`
- Keep existing `onConfirm` callback pattern

### Commit 2
```
fix(trade): wire confirming state through stock-detail-client
```
**File:** `src/app/dashboard/stock/[symbol]/stock-detail-client.tsx`
- Add `confirming` state alongside existing `buyLoading`/`sellLoading`
- Pass `confirming` to `<TradeConfirmation>` component
- Set `confirming = true` before calling `executeTrade`, set `false` after
- Ensure dialog closes only after trade completes

### Commit 3
```
fix(onboarding): add loading state to Got it button
```
**File:** `src/components/onboarding/onboarding-modal.tsx`
- Add `loading` state to `handleDismiss`
- Disable "Got it" button while loading
- Show `Loader2` spinner during PATCH `/api/onboarding`
- Add error toast on failure (import `toast` from `sonner`)

### Commit 4
```
fix(auth): add loading state to Google sign-in button
```
**File:** `src/app/login/page.tsx`
- Add `googleLoading` state
- Disable Google button while `googleLoading` is true
- Set `googleLoading = true` before `signInWithOAuth`, set `false` on error
- Keep existing email form loading state separate

### Commit 5
```
fix(auth): add loading state to Google sign-up button
```
**File:** `src/app/signup/page.tsx`
- Same pattern as login: add `googleLoading` state
- Disable Google button during OAuth redirect

### Commit 6
```
fix(auth): disable all buttons during email login
```
**File:** `src/app/login/page.tsx`
- When email login is submitting, also disable the Google button
- Prevents clicking Google while email login is in flight

### Commit 7
```
fix(auth): disable all buttons during email signup
```
**File:** `src/app/signup/page.tsx`
- Same as commit 6: disable Google button during email signup

### Commit 8
```
fix(auth): add root loading.tsx for auth redirect
```
**New file:** `src/app/loading.tsx`
- Simple centered spinner (use existing `<Loader2>` with `animate-spin`)
- Covers the async `getUser()` blank screen on `/` route

### Commit 9
```
fix(trade): add Loader2 spinner to Confirm button
```
**File:** `src/components/trade/trade-confirmation.tsx`
- Import `Loader2` from lucide-react
- Show `Loader2 animate-spin` instead of text when `confirming` is true
- Keep button text "Confirm Buy" / "Confirm Sell" when not confirming

---

## Phase 2: Server-Side Security (3 commits)

### Commit 10
```
fix(api): verify server-side price for buy orders
```
**File:** `src/app/api/stocks/buy/route.ts`
- After reading the request body, fetch live quote from internal `/api/stocks/quote?symbol=...`
- Compare submitted `pricePerShare` against live `currentPrice`
- Reject if difference exceeds 5% tolerance: `Math.abs(submitted - live) / live > 0.05`
- Return 400 with descriptive error message
- This prevents users from manipulating the price via DevTools

### Commit 11
```
fix(api): verify server-side price for sell orders
```
**File:** `src/app/api/stocks/sell/route.ts`
- Same pattern as commit 10: fetch live quote, validate price within 5% tolerance
- Reject stale/manipulated prices

### Commit 12
```
fix(rls): restrict friendship UPDATE to status column only
```
**New migration:** `supabase/migrations/017_restrict_friendship_update.sql`
- Drop existing UPDATE policy on `friendships` table
- Create new policy that limits updates to `status` column only
- Use WITH CHECK clause to restrict values

```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Addressee can update friendship status" ON friendships;

-- Create restricted policy: only status column can be updated
CREATE POLICY "Addressee can update friendship status"
  ON friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (
    auth.uid() = addressee_id
    AND status IN ('accepted', 'declined')
  );
```

---

## Phase 3: Error Handling (3 commits)

### Commit 13
```
fix(leaderboard): add error UI on API failure
```
**File:** `src/app/dashboard/leaderboard/page.tsx`
- Add `error` state alongside existing `loading` state
- In `fetchLeaderboard`: set `error` on catch instead of silently failing
- When `error` is set: show error message + retry button (similar to transaction-history pattern)
- Clear error on retry

### Commit 14
```
fix(friends): add error UI on initial fetch failure
```
**File:** `src/components/friends/friends-modal.tsx`
- Add `error` state for the initial friends list fetch
- When `error` is set: show error message + retry button inside the modal
- Clear error on retry
- Keep existing toast errors for individual actions (accept/decline/remove)

### Commit 15
```
fix(onboarding): add error toast on PATCH failure
```
**File:** `src/components/onboarding/onboarding-modal.tsx`
- In `handleDismiss` catch block: add `toast.error("Failed to save progress")`
- Import `toast` from `sonner`
- Modal still closes even on error (existing behavior)

---

## Phase 4: Cleanup & Docs (3 commits)

### Commit 16
```
fix(api): test Yahoo Finance fallback for quotes
```
**File:** `src/app/api/stocks/quote/route.ts`
- Verify the Finnhub → Yahoo fallback chain works correctly
- Add logging for fallback triggers (optional)
- Ensure graceful degradation when both fail

### Commit 17
```
chore: clean up unused imports across codebase
```
**Multiple files:**
- Run through all modified files in this branch
- Remove any unused imports introduced during refactoring
- Files to check: `dashboard-content.tsx`, `stock-detail-client.tsx`, `transaction-history.tsx`, `navbar.tsx`

### Commit 18
```
docs(handoff): update with security and loading state fixes
```
**File:** `handoff.md`
- Update "Working Features" section with new fixes
- Update "Remaining (Future)" section — remove completed items
- Update "Key Files" table if any new files were added
- Update "Session Resume Instructions" with current branch status

---

## Verification

After all 18 commits:
1. Run `npm run build` — should pass with 0 errors
2. Run `npx tsc --noEmit` — should pass with 0 errors
3. Test buy flow: click Buy → Confirm → verify button disables during submission
4. Test sell flow: same as buy
5. Test spin: click Spin → verify button disables during animation
6. Test onboarding: click "Got it" → verify button shows spinner
7. Test Google sign-in: click button → verify it disables during redirect
8. Test leaderboard: disconnect network → verify error message appears
9. Verify no duplicate transactions from rapid double-clicks

---

## Notes

- **Server-side price verification** (commits 10-11): 5% tolerance allows for normal price movement between when the user loaded the page and when they submitted. Tighter tolerance would cause false rejections.
- **RLS migration** (commit 12): Must be run manually in Supabase SQL Editor after deploying.
- **No idempotency constraint**: Client-side guards (disabled buttons) are sufficient for this personal project with fake currency. Revisit if scaling to real money.
- **OMO-Slim config**: Agent models are set to `opencode-go/mimo-v2.5` in `~/.config/opencode/oh-my-opencode-slim.json`. Restart OpenCode after changes.
