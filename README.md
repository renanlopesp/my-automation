# DSM Automation System

A sophisticated Webflow automation system with automatic login detection and CAPTCHA handling capabilities.

## 🚀 Features

### Core Automation

- **Template Transfer Management**: Automate Webflow template transfers between users
- **Auto-Login Detection**: Automatically detects login status and logs in when needed
- **CAPTCHA Detection & Resolution**: Advanced CAPTCHA detection with email alerts
- **Human Behavior Simulation**: Realistic mouse movements and typing patterns

### CAPTCHA Handling

- **Multi-Platform Detection**: Supports Cloudflare, reCAPTCHA, hCAPTCHA, and generic CAPTCHAs
- **Email Alerts**: Automatic notifications with resolution instructions
- **Screenshot Capture**: Automatic screenshots for debugging

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Google Chrome** or **Chrome Canary**
- **SurrealDB** (for data storage)
- **AWS S3** (for log storage)
- **Resend** account (for email alerts)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dsm-automation
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## ⚙️ Configuration

### Environment Variables

The system uses several environment variable categories:

#### Core Configuration

```env
NODE_ENV=development
ROUND_DELAY=30
MARKETPLACE_TOKEN=your_marketplace_token_here
```

#### Webflow Auto-Login

```env
WEBFLOW_USERNAME=your_webflow_email
WEBFLOW_PASSWORD=your_webflow_password
WEBFLOW_BASE_URL=https://webflow.com
```

#### CAPTCHA Detection

```env
ADMIN_EMAIL=admin@yourdomain.com
RESEND_API_KEY=your_resend_api_key
CAPTCHA_WAIT_TIMEOUT=300000
```

#### SurrealDB Configuration

```env
# Local Environment
SURREAL_URL=ws://localhost:8000
SURREAL_USER=root
SURREAL_PASSWORD=root

# Development Environment
DEV_SURREAL_URL=your_dev_surreal_url
DEV_SURREAL_USER=your_dev_user
DEV_SURREAL_PASSWORD=your_dev_password

# Production Environment
PROD_SURREAL_URL=your_prod_surreal_url
PROD_SURREAL_USER=your_prod_user
PROD_SURREAL_PASSWORD=your_prod_password
```

## 🚀 Running the System

### Development Mode

```bash
# Start Chrome with debugging
npm run start

# Start full automation system
npm run start:all
```

### Production Mode

```bash
# Set environment to production
NODE_ENV=production npm run start:all
```

## 🔧 Key Components

### Auto-Login System

The system automatically detects login status and logs in when needed:

```javascript
// Automatically checks login status before operations
await checkAndLogin(browser, options)
```

**Features:**

- Detects if already logged in
- Automatically navigates to login page if needed
- Human-like typing and interaction patterns
- CAPTCHA detection during login process

### CAPTCHA Detection & Resolution

Advanced CAPTCHA handling with email-based resolution:

```javascript
// Automatic CAPTCHA detection on any page
const safePage = createSafePage(page)
await safePage.goto('https://webflow.com/dashboard')
```

**Detection Types:**

- Cloudflare challenges
- reCAPTCHA v2/v3
- hCAPTCHA
- Generic CAPTCHA patterns
- Text-based detection

**Resolution Methods:**

1. **Email Alerts**: Automatic notifications with instructions
2. **Manual Resolution**: Direct server access

## 📁 Project Structure

```
dsm-automation/
├── src/
│   ├── actions/           # Core automation actions
│   │   ├── checkAndLogin.js    # Auto-login detection
│   │   ├── loginWebflow.js     # Login implementation
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   ├── captchaDetector.js  # CAPTCHA detection
│   │   ├── safePage.js         # CAPTCHA-aware page wrapper
│   │   ├── humanInteractions.js # Human behavior simulation
│   │   └── ...
│   ├── ops/               # Browser operations
│   │   ├── preparePage.js      # Page preparation with stealth
│   │   ├── startChrome.js      # Chrome launch
│   │   └── ...
├── data/                  # Screenshots and logs
├── .env                   # Environment configuration
└── package.json
```

## 🔍 CAPTCHA Resolution Workflow

1. **Detection**: System detects CAPTCHA during automation
2. **Alert**: Email sent to admin with resolution instructions
3. **Resolution**: Manual CAPTCHA solving on server
4. **Continuation**: Automation resumes automatically

### Email Alert System

- Automatic notifications
- Screenshot attachments
- Resolution instructions
- Server access details

## 📊 Monitoring & Logging

### Log Files

- `./general.log`: Main application logs
- `./data/screenshots/`: CAPTCHA screenshots
- `./data/browser/`: Chrome user data

## 🚨 Troubleshooting

### Common Issues

1. **Chrome Connection Failed**

   ```bash
   # Check Chrome is running
   ps aux | grep chrome
   # Restart Chrome
   npm run start
   ```

2. **CAPTCHA Detection Issues**

   - Check `ADMIN_EMAIL` configuration
   - Verify `RESEND_API_KEY` is valid

3. **SurrealDB Connection**
   - Verify database credentials
   - Check network connectivity
   - Ensure SurrealDB is running
