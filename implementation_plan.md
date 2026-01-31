# Implementation Plan - Market Data Dump to Oracle DB

This project aims to fetch market data (building on `marketdata-fetch-automation`) and store it in an Oracle Autonomous Database (Always Free) on OCI.

## Phase 1: Oracle Cloud Infrastructure (OCI) Setup
1.  **Create OCI Account**: Sign up for the OCI Free Tier if not already done.
2.  **Provision Autonomous Database**:
    *   Navigate to **Oracle Database** > **Autonomous Database**.
    *   Click **Create Autonomous Database**.
    *   Ensure "Always Free" is selected.
    *   Set Database Name (e.g., `MARKETDATA`).
    *   Choose **Transaction Processing** workload type.
    *   Set **ADMIN** password.
    *   Wait for provisioning to complete.
3.  **Download Connection Wallet**:
    *   Go to the DB details page.
    *   Click **DB Connection**.
    *   Download the **Wallet** (Zip file).
    *   Extract it to a secure location (e.g., `./wallet` in the project).

## Phase 2: Project Initialization (`marketdata-dump-automation`)
1.  Initialize npm project.
2.  Install dependencies: `knex`, `oracledb`, `dotenv`.
3.  Copy logic from `marketdata-fetch-automation` (auth, fetching).
4.  Configure `database.js` to use Oracle instead of SQLite.

## Phase 3: Implementation
1.  Update `database.js` connection string.
2.  Handle schema creation (Oracle specific types if needed).
3.  Implement the dump logic.

## Phase 4: Testing & Automation
1.  Verify connection.
2.  Run fetch and dump cycle.
3.  Schedule/Automate.
