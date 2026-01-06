# User Tracker

Определяет, посещал ли пользователь заготовленный ленд перед переходом на игру.

Detects if user visited Landing before going to Casino.

## Architecture

- **siteA** (Landing) - Controlled. Redirects user to siteX to set tracking cookie.
- **siteX** (Game Provider) - Controlled. Embedded as iframe in both siteA and siteB. Sets/reads cookies.
- **siteB** (Casino) - NOT controlled. Just embeds siteX iframe.

**Flow:**
1. User visits siteA (Landing)
2. siteA redirects user to siteX/register → siteX sets cookie (first-party context)
3. User returns to siteA, later visits siteB (Casino)
4. siteB embeds siteX iframe → browser sends siteX cookie with request
5. siteX server reads cookie from request headers → knows user was tracked

## Key Points

- **CLIENT-SIDE ONLY** - NO server-side storage, NO databases, NO Redis. localStorage/cookies ONLY.
- Casino script runs inside iframe on third-party sites - NO redirects, NO popups possible
- Landing tests multiple tracking methods (iframe, popup, redirect, etc.)
- Casino does ONE check to see all tracking data
- On localhost: no storage partitioning, all methods work
- On production (different domains): storage partitioning affects iframe methods

## Files

- `src/serverA.ts` - Landing
- `src/serverT.ts` - Tracker
- `src/serverX.ts` - Casino
