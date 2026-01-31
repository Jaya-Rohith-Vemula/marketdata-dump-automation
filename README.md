# Market Data Dump Automation (Oracle DB)

A robust, type-safe TypeScript application designed to fetch historical and real-time market data and dump it into an **Oracle Autonomous Database** (Always Free Tier).

## 🚀 Features

- **TypeScript Core**: Fully typed for reliability and maintainability.
- **Oracle DB Integration**: Powered by `knex` and `node-oracledb`, optimized for OCI Autonomous Databases.
- **Dual Fetching Modes**:
  - `historical`: Backfills deep historical data.
  - `latest`: Syncs the database with the most recent market data.
- **Auto-Schema Management**: Automatically creates the `historical` table in Oracle on the first run.
- **Graceful Shutdown**: Handles `SIGINT`/`SIGTERM` to close database connections cleanly.
- **Automated Authentication**: Captures and refreshes XSRF tokens and cookies using Playwright.

## 🛠️ Tech Stack

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript
- **Database Layer**: Knex.js
- **Oracle Driver**: `oracledb` (6.x - Thin Mode supported)
- **Automation**: Playwright (for auth capture)
- **HTTP Client**: Axios

## 📋 Prerequisites

1.  **Node.js**: v18 or higher recommended.
2.  **Oracle Cloud Account**: To provision a free Autonomous Database (ATP).
3.  **OCI Wallet**: Connection credentials downloaded from the OCI console.

## ⚙️ Setup & Installation

1.  **Clone and Install**:
    ```bash
    npm install
    # Install Playwright browser
    npx playwright install chromium
    ```

2.  **Database Setup**:
    - Follow the detailed **[Oracle Setup Guide](./DATABASE_SETUP.md)** to provision your database.
    - Place your extracted wallet files in the `./wallet` directory.

3.  **Environment Configuration**:
    Create a `.env` file (or update the existing one):
    ```env
    DOMAIN=https://www.required-domain.com
    SYMBOL=PLTR
    MODE=historical # Options: historical, latest

    # Oracle DB
    DB_USER=ADMIN
    DB_PASSWORD=YourPassword
    DB_CONNECT_STRING="YourFullConnectionString"
    TNS_ADMIN="/absolute/path/to/project/wallet"
    ```

## 🏃 Running the Application

### Development Mode (Direct TS)
```bash
npm run dev
```

### Production Build
```bash
# Compile TS to JS
npm run build

# Start the compiled app
npm start
```

## 🔄 Mode Selection

You can switch modes via the `.env` file or by passing it in the command line:

- **Backfill History**:
  ```bash
  MODE=historical npm run dev
  ```
- **Sync Latest Data**:
  ```bash
  MODE=latest npm run dev
  ```

## 📂 Project Structure

- `index.ts`: Entry point and process management.
- `database.ts`: Oracle connection and schema initialization.
- `authManager.ts`: Playwright-based authentication logic.
- `fetchHistorical.ts`: API interaction with market data endpoints.
- `runHistoricalData.ts` / `runLatestData.ts`: Core processing logic for each mode.
- `helper.ts`: Data parsing, sleep utilities, and shared interfaces.
