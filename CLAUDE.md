# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DSM Automation is a Webflow template transfer automation system with advanced CAPTCHA handling and human behavior simulation. It automates template transfers between users while detecting and handling CAPTCHAs through email alerts and manual resolution workflows.

## Key Development Commands

### Starting the System
```bash
# Development mode with auto-restart on file changes
npm run dev

# Start Chrome with debugging port (required first)
npm run start:chrome

# Production mode
NODE_ENV=production npm run start

# PM2 process management
npm run start:pm2        # Start all services including dashboard
npm run stop:pm2         # Stop all PM2 processes
npm run logs:pm2         # View PM2 logs

# API Server
npm run start:server     # Start the API server on port 3001

# Dashboard (React + Vite)
npm run dashboard:dev    # Start dashboard in dev mode (port 5173)
npm run dashboard:build  # Build dashboard for production
npm run dashboard:preview # Preview production build

# Chrome Canary (macOS only)
npm run canary
```

### Code Quality
```bash
# Lint code with ESLint
npx eslint src/

# Format code with Prettier
npx prettier --write src/

# Check formatting
npx prettier --check src/
```

## React Dashboard

The project includes a modern React dashboard built with Vite and TypeScript located in `/dashboard`:

### Dashboard Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS v3.4** for styling
- **React Query (TanStack Query)** for server state management
- **Zustand** for local state management
- **React Router v6** for navigation
- **Recharts** for data visualization
- **WebSocket** for real-time updates

### Dashboard Features
- **Real-time monitoring** of all environments (local/dev/prod)
- **Queue visualization** with status indicators
- **Transfer tracking** with progress bars
- **Activity feed** with live updates
- **Interactive controls** to trigger tasks
- **Responsive design** with dark mode support

### Dashboard Structure
```
dashboard/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages (Overview, Queues, etc)
│   ├── services/       # API and WebSocket services
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Zustand store configuration
│   └── types/          # TypeScript type definitions
```

### Running the Dashboard
```bash
# Development (standalone)
cd dashboard && npm run dev

# Via PM2 (with backend)
npm run start:pm2  # Starts backend + dashboard

# Access at http://localhost:5173
```

## Architecture Overview

### Core Loop (`src/index.js`)
The main automation loop runs three sequential operations:
1. **Receive**: Processes incoming template transfers from marketplace
2. **Rename**: Applies naming conventions based on environment 
3. **Send**: Transfers templates to target users

Operates on multiple environments:
- Development: Uses 'local' database only
- Production: Uses 'dev' and 'prod' databases simultaneously

### Critical Pattern: SafePage Wrapper
**ALWAYS use SafePage for browser navigation to handle CAPTCHAs:**

```javascript
// CORRECT - CAPTCHA-aware
import { createSafePage } from '../utils/safePage.js'
const safePage = createSafePage(page)
await safePage.goto('https://webflow.com/dashboard')
await safePage.click('button')
await safePage.type('input', 'text')

// INCORRECT - Will miss CAPTCHAs
await page.goto('https://webflow.com/dashboard')  // DON'T DO THIS
```

### Import Map System
The project uses custom import aliases defined in `package.json`:
```javascript
import { action } from '#actions'        // src/actions/index.js
import { config } from '#config'         // src/config.js
import { dataAction } from '#dataActions' // src/data/actions/index.js
import { op } from '#ops'                // src/ops/index.js
import { util } from '#utils'            // src/utils/index.js
```

### CAPTCHA Detection & Resolution Flow
1. **Automatic Detection** (`src/utils/captchaDetector.js`): Detects 6 types (Cloudflare, reCAPTCHA v2/v3, hCAPTCHA, generic)
2. **Email Alert** (`src/utils/sendCaptchaAlert.js`): Sends screenshot to `ADMIN_EMAIL`
3. **Manual Resolution**: 5-minute timeout for human intervention on server
4. **Auto-Continue**: System resumes automatically after resolution

### Database Layer (`src/data/surreal.js`)
- Uses SurrealDB with JWT authentication
- Singleton pattern with automatic reconnection
- Environment-specific connections (local/dev/prod)
- Connection timeout: 5 seconds

### Browser Management (`src/ops/`)
- Chrome launched with stealth arguments to avoid detection
- Persistent user data in `./data/browser/`
- Remote debugging on port 9922
- Human behavior simulation (`src/utils/humanBehavior.js`)

## Environment Configuration

### Required Environment Variables
```env
# Core
NODE_ENV=development          # or 'production'
ROUND_DELAY=30               # seconds (dev) or minutes (prod)

# Webflow Auto-Login
WEBFLOW_USERNAME=            # Webflow account email
WEBFLOW_PASSWORD=            # Webflow account password

# CAPTCHA Handling
ADMIN_EMAIL=                 # Email for CAPTCHA alerts
RESEND_API_KEY=             # Resend.com API key
CAPTCHA_WAIT_TIMEOUT=300000 # 5 minutes default

# Chrome
CHROME_DATA_DIR=./data/browser

# Database (separate credentials for each environment)
SURREAL_URL=ws://localhost:8000
SURREAL_USER=root
SURREAL_PASSWORD=root

DEV_SURREAL_URL=
DEV_SURREAL_USER=
DEV_SURREAL_PASSWORD=

PROD_SURREAL_URL=
PROD_SURREAL_USER=
PROD_SURREAL_PASSWORD=
```

## Code Style Configuration

### ESLint Rules (`.eslintrc.json`)
- ES2021, ES modules
- Single quotes enforced
- No semicolons
- Arrow function spacing required
- Object curly spacing always

### Prettier (`.prettierrc`)
- Line width: 80 characters
- Tab width: 2 spaces
- Single quotes
- No semicolons
- Trailing commas

## Critical Implementation Details

### Transfer Lifecycle States
Templates move through states tracked in SurrealDB:
- `pending` → `processing` → `completed` or `failed`
- Status updates stored with timestamps and error details

### Selector Strategy
- Prefer `data-automation-id` attributes when available
- Webflow-specific selectors in `src/data/webflowSelectors.js`
- XPath selectors for complex DOM queries

### Error Handling
- Winston logging to `./general.log`
- Screenshots saved to `./data/screenshots/` on errors
- Automatic retry logic with exponential backoff
- Maximum 5 consecutive errors before shutdown

### PM2 Process Management
Configured in `ecosystem.config.cjs` for production:
- Auto-restart on crash
- Memory limit: 1GB (main), 500MB (API server)
- Separate log files for each process

## Common Pitfalls & Solutions

1. **CAPTCHA Blindness**: Always use SafePage wrapper, never raw Puppeteer
2. **Chrome Not Running**: Run `npm run start:chrome` before main automation
3. **Database Connection Failed**: Verify environment-specific credentials
4. **Email Alerts Not Sending**: Check RESEND_API_KEY configuration
5. **Selector Changes**: Webflow UI updates may require selector updates

## Monitoring & Debugging

- **Logs**: Check `./general.log` for operational details
- **Screenshots**: `./data/screenshots/` for CAPTCHA captures
- **Chrome Debug**: Connect to `localhost:9922` for browser debugging
- **Database Status**: Connection logs show successful auth
- **PM2 Monitoring**: `npm run logs:pm2` for process logs