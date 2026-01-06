# User Tracker

Cross-site user tracking demo. Detects if user visited Landing before going to Casino.

## Architecture

```
Landing (landing.local:3000)
    ↓ sets tracking data
Tracker (tracker.local:3002)
    ↑ checks tracking data
Game (game.local:3003) ← embedded in Casino
    ↑
Casino (casino.local:3001)
```

- **Landing** - runs tracking tests, redirects to Tracker to set cookies/localStorage
- **Tracker** - central storage, sets first-party cookies and localStorage
- **Game** - embedded in Casino, calls Tracker to verify tracking
- **Casino** - third-party site, embeds Game iframe

## Setup

### 1. Add to hosts file

**Windows** (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 landing.local
127.0.0.1 game.local
127.0.0.1 tracker.local
127.0.0.1 casino.local
```

**Linux/Mac** (`/etc/hosts`):
```
127.0.0.1 landing.local
127.0.0.1 game.local
127.0.0.1 tracker.local
127.0.0.1 casino.local
```

### 2. Install dependencies

```bash
bun install
```

### 3. Generate SSL certs (optional, for HTTPS)

```bash
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:landing.local,DNS:game.local,DNS:tracker.local,DNS:casino.local"
```

### 4. Run

**Development (with hot reload):**
```bash
bun run dev:a  # Landing  - https://landing.local:3000
bun run dev:b  # Game     - https://game.local:3003
bun run dev:t  # Tracker  - https://tracker.local:3002
bun run dev:x  # Casino   - https://casino.local:3001
```

**Docker:**
```bash
make start   # Start all services
make stop    # Stop all services
make logs    # View logs
```

## Tracking Methods

| Method | Description |
|--------|-------------|
| Cookie | SameSite=None cookie set via redirect |
| Iframe | postMessage to Tracker iframe |
| Popup | postMessage to Tracker popup |
| Redirect | Direct redirect to Tracker, write to first-party storage |
| Fingerprint | Browser fingerprint stored on Tracker |
| Service Worker | SW registers on Tracker, stores in Cache API |
| Shared Storage | Chrome Privacy Sandbox API |

## Test Flow

1. Visit https://tracker.local:3002 → Clear All
2. Visit https://landing.local:3000 → Run All Tests
3. Visit https://casino.local:3001 → Check if Game shows "Tracked"

## Environment Variables

```
TRACKER_URL=https://tracker.local:3002
BRIDGE_URL=https://game.local:3003
```
