# Oracle Autonomous Database Setup Guide

Follow these steps to set up your free Oracle Database and connect this project to it.

## 1. Create a Database on OCI
1.  **Sign in** to your [Oracle Cloud Console](https://cloud.oracle.com/).
2.  Open the navigation menu (top left) and click **Oracle Database** > **Autonomous Database**.
3.  Click **Create Autonomous Database**.
4.  **Compartment**: Use your default.
5.  **Display Name**: `MarketDataDB` (or any).
6.  **Database Name**: `MARKETDATA` (or any).
7.  **Workload Type**: Select **Transaction Processing**.
8.  **Deployment Type**: Select **Shared Infrastructure**.
9.  **Always Free**: **CRITICAL!** Toggle this **ON**.
10. **Database Version**: Keep default (e.g., 21c or 19c).
11. **Admin Credentials**:
    *   **Username**: `ADMIN`
    *   **Password**: Create a strong password (e.g., `MySecret1234#`). **Save this.**
12. **Network Access**:
    *   For easiest setup, choose **Secure access from everywhere**.
    *   (Optional) If you want more security, you can restrict by IP.
13. Click **Create Autonomous Database**.

## 2. Get Connection Details & Wallet
1.  Wait for the status to turn **Green (Available)**.
2.  Go to the database details page.
3.  Click **DB Connection**.
4.  **Download Wallet**:
    *   Click **Download Wallet**.
    *   Enter a password for the wallet (can be the same as ADMIN).
    *   Download the `.zip` file.
5.  Extract the `.zip` content into a folder named `wallet` inside this project directory:
    *   Path: `/Users/ross/Documents/marketdata-dump-automation/wallet/`
6.  In the **DB Connection** window, look at the **Connection Strings**.
    *   Find the one ending in `_low` or `_tp`.
    *   Copy the full string (the one starting with `(description=...`).

## 3. Update Project Configuration
Open the `.env` file in this project and fill in the details:

```env
DB_USER=ADMIN
DB_PASSWORD=YourAdminPassword
DB_CONNECT_STRING="COPIED_CONNECTION_STRING"
TNS_ADMIN="/Users/ross/Documents/marketdata-dump-automation/wallet"
```

## 4. Run the Project
1.  Install dependencies: `npm install`
2.  Run the fetcher: `node index.js`

The script will automatically:
*   Connect to Oracle.
*   Create the `historical` table if it doesn't exist.
*   Fetch and dump the data.
