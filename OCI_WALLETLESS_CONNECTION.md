# Oracle Autonomous Database - Walletless (TLS) Connection Guide

This guide explains how to establish a walletless (TLS) connection to Oracle Autonomous Database (ADB) and how to manage data operations (table creation and bulk insertion). 

By using **TLS**, you avoid the need for downloading, syncing, or managing `cwallet.sso` files and `TNS_ADMIN` configurations. This is the **Oracle Recommended** approach.

---

## 📌 1. Prerequisites

Ensure you have the Oracle Database driver installed in your project:

For Node.js/TypeScript (using `node-oracledb` v6.0+ which runs in **Thin Mode** by default):
```bash
npm install oracledb
```

---

## 📌 2. Environment Configuration

You only need **three** variables to connect. No wallet folder or paths are required.

Add these to your `.env` file:

```env
DB_USER=ADMIN
DB_PASSWORD=your_database_password
DB_CONNECT_STRING="(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-phoenix-1.oraclecloud.com))(connect_data=(service_name=your_service_name_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
```

> [!IMPORTANT]
> **How to get the TLS Connection String:**
> 1. In your **OCI Console**, go to your **Autonomous Database** details.
> 2. Click **DB Connection**.
> 3. Under **Connection Strings**, ensure the toggle/dropdown is set to **TLS** (NOT mutual TLS / mTLS).
> 4. Copy the connection string ending with `_low` or `_tp` which uses `protocol=tcps` and port `1522`.

---

## 📌 3. Connection Code (TypeScript/Node.js)

Here is how to initialize the connection in your application code:

```typescript
import oracledb from "oracledb";
import "dotenv/config";

let persistentConn: any = null;

export async function getConn() {
    if (persistentConn) return persistentConn;

    console.log("Opening new Oracle connection (Walletless TLS)...");
    
    persistentConn = await oracledb.getConnection({
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        connectString: process.env.DB_CONNECT_STRING!,
    });
    
    console.log("Oracle connection established.");
    return persistentConn;
}

export async function closeConn() {
    if (persistentConn) {
        await persistentConn.close();
        persistentConn = null;
    }
}
```

---

## 📌 4. Initializing the Schema (Creating Tables)

To avoid errors when re-running initialization, check if the table exists first. Here is how to create a table safely using raw SQL triggers or direct execution:

```typescript
export async function createTable() {
    const conn = await getConn();

    try {
        // Example: Check if table exists or just run CREATE TABLE with error handling
        const sqlCreate = `
            CREATE TABLE "historical" (
                "symbol" VARCHAR2(20),
                "trade_date" VARCHAR2(20),
                "trade_time" VARCHAR2(20),
                "open" NUMBER,
                "high" NUMBER,
                "low" NUMBER,
                "close" NUMBER,
                "volume" NUMBER,
                "datetime" VARCHAR2(50),
                CONSTRAINT PK_HISTORICAL PRIMARY KEY ("symbol", "trade_date", "trade_time")
            )
        `;

        await conn.execute(sqlCreate);
        console.log("Table 'historical' created.");
    } catch (error: any) {
        if (error.errorNum === 955) { // ORA-00955: name is already used by an existing object
            console.log("Table 'historical' already exists.");
        } else {
            console.error("Error creating table:", error);
            throw error;
        }
    }
}
```

---

## 📌 5. Dumping Data / Bulk Insertion

For high performance, use **`executeMany()`**. 

To make the script **re-runnable (Idempotent)**, you should use an format that inserts only if the primary key doesn't exist. Since Oracle doesn't have `INSERT IGNORE`, you can use `SELECT FROM DUAL WHERE NOT EXISTS`.

### Configuration Example:

```typescript
interface MarketDataRow {
    symbol: string;
    trade_date: string;
    trade_time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    datetime: string;
}

export async function dumpData(newRows: MarketDataRow[]) {
    const conn = await getConn();

    console.log(`Inserting ${newRows.length} rows directly via oracledb...`);

    const sql = `
      INSERT INTO "historical" ("symbol", "trade_date", "trade_time", "open", "high", "low", "close", "volume", "datetime")
      SELECT :symbol, :trade_date, :trade_time, :open, :high, :low, :close, :volume, :datetime FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM "historical" 
        WHERE "symbol" = :symbol AND "trade_date" = :trade_date AND "trade_time" = :trade_time
      )
    `;

    try {
        const result = await conn.executeMany(sql, newRows, { autoCommit: true });
        console.log(`Inserted rows directly. Rows affected: ${result.rowsAffected}`);
    } catch (error) {
        console.error("Error during dumpData:", error);
        throw error;
    }
}
```

---

## 📌 Summary for the AI
1.  **Driver**: Use `node-oracledb` (v6+) - it runs in **Thin mode** by default.
2.  **No Wallet**: Don't use `TNS_ADMIN` or wallet bundles.
3.  **Connection String**: Must use `protocol=tcps` and port `1522` (Found in OCI Console under TLS Connections).
4.  **Bulk Insertion**: Use `executeMany()` with `Dual` trick for idempotency to avoid primary key conflicts.
