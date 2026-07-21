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
13. **Mutual TLS (mTLS)**: Toggle this **OFF** to allow TLS connections without a wallet.
14. Click **Create Autonomous Database**.

## 2. Get Connection Details (TLS)
1.  Wait for the status to turn **Green (Available)**.
2.  Go to the database details page.
3.  Click **DB Connection**.
4.  Under **TLS Authentication**, select **TLS** (not Mutual TLS).
5.  In the **Connection Strings** section, find the one ending in `_low` or `_tp`.
6.  Copy the full connection string (the one starting with `(description=...`).
    *   The string will use `protocol=tcps` for a secure TLS connection directly — **no wallet download is needed**.

## 3. Update Project Configuration
Open the `.env` file in this project and fill in the details:

```env
DB_USER=ADMIN
DB_PASSWORD=YourAdminPassword
DB_CONNECT_STRING="COPIED_CONNECTION_STRING"
```

> **Note:** Since we are using a direct TLS connection, there is no need for a `TNS_ADMIN` path or a downloaded wallet.

## 4. Run the Project
1.  Install dependencies: `npm install`
2.  Run the fetcher: `npm run dev:log`

The script will automatically:
*   Connect to Oracle via TLS.
*   Create the `historical` table if it doesn't exist.
*   Fetch and dump the data.
