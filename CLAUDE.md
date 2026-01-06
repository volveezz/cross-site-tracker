# User Tracker

Определяет, посещал ли пользователь заготовленный ленд перед переходом на игру.

Detects if user visited Landing before going to Casino.

## Architecture

- **Landing** (port 3000) - Multiple WRITE methods to register visits with Tracker
- **Tracker** (port 3002) - Central storage using browser localStorage
- **Casino** (port 3001) - ONE READ to detect if user came from Landing

## Key Points

- Client-side only (localStorage)
- Landing tests multiple tracking methods (iframe, popup, redirect, etc.)
- Casino does ONE check to see all tracking data
- On localhost: no storage partitioning, all methods work
- On production (different domains): storage partitioning affects iframe methods

## Files

- `src/serverA.ts` - Landing
- `src/serverT.ts` - Tracker
- `src/serverX.ts` - Casino
