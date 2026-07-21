import knex from "knex";
import type { Knex } from "knex";
import oracledb from "oracledb";
import "dotenv/config";

// We use "any" for the config to avoid strict Knex + Oracle type conflicts 
// especially when host/port are omitted in favor of connectString/walletLocation.
console.log("Initializing database connection...");
console.log("DB_USER:", process.env.DB_USER || "ADMIN");
console.log("DB_CONNECT_STRING:", process.env.DB_CONNECT_STRING ? "REDACTED" : "NOT SET");
console.log("Connection Mode: Walletless TLS");

const dbConfig: any = {
    client: "oracledb",
};

console.log("Creating Knex instance...");
export const db: Knex = knex(dbConfig);
// Manually attach the driver to ensure Knex uses the correct oracledb constants
(db.client as any).driver = oracledb;

let persistentConn: any = null;

export async function getConn() {
    if (persistentConn) return persistentConn;

    console.log("Opening new Oracle connection...");
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

export async function initSchema() {
    console.log("Initializing schema (Tables only)...");
    const conn = await getConn();

    try {
        // 1. Create SYMBOLS table if it doesn't exist
        const symbolsExists = await db.schema.connection(conn).hasTable("SYMBOLS");
        if (!symbolsExists) {
            console.log("Creating 'SYMBOLS' table...");
            await db.schema.connection(conn).createTable("SYMBOLS", (table) => {
                table.string("SYMBOL", 10).primary();
                table.integer("IS_ACTIVE").defaultTo(1);
                table.timestamp("CREATED_AT").defaultTo(db.fn.now());
            });
            console.log("Table 'SYMBOLS' created.");
        }

        // 2. Create 'historical' table if it doesn't exist
        const historicalExists = await db.schema.connection(conn).hasTable("historical");
        if (!historicalExists) {
            console.log("Creating 'historical' table...");
            await db.schema.connection(conn).createTable("historical", (table) => {
                table.string("symbol", 20);
                table.string("trade_date", 20);
                table.string("trade_time", 20);
                table.float("open");
                table.float("high");
                table.float("low");
                table.float("close");
                table.bigInteger("volume");
                table.string("datetime", 50);

                table.primary(["symbol", "trade_date", "trade_time"]);
            });
            console.log("Table 'historical' created.");
        }

        // 3. Self-healing: ensure SYNCED_THROUGH exists on SYMBOLS (added after initial launch).
        // Tracks the last confirmed gap-free sync point per symbol, independent of MAX(historical) —
        // only advanced once a full backward walk has provably reached it (see runSync.ts).
        const syncedThroughCol = await conn.execute(
            `SELECT column_name FROM user_tab_columns WHERE table_name = 'SYMBOLS' AND column_name = 'SYNCED_THROUGH'`
        );
        if (!(syncedThroughCol as any).rows || (syncedThroughCol as any).rows.length === 0) {
            console.log("Adding 'SYNCED_THROUGH' column to SYMBOLS...");
            await conn.execute(`ALTER TABLE SYMBOLS ADD (SYNCED_THROUGH VARCHAR2(20))`, [], { autoCommit: true });
            console.log("'SYNCED_THROUGH' column added.");
        }
    } catch (error) {
        console.error("Error during initSchema:", error);
        throw error;
    }
}

/**
 * Self-healing mechanism: Re-creates triggers and ensures all existing symbols
 * in the 'historical' table are also documented in the 'SYMBOLS' table.
 */
export async function repairSchema() {
    console.log("Starting schema repair and self-healing...");
    const conn = await getConn();

    try {
        // 1. Re-ensure SYMBOLS table (just in case)
        await initSchema();

        // 2. Re-create / Update Trigger
        console.log("Ensuring insertion trigger exists...");
        const triggerSql = `
            CREATE OR REPLACE TRIGGER TRG_AUTO_ADD_SYMBOL
            AFTER INSERT ON "historical"
            FOR EACH ROW
            DECLARE
                v_count NUMBER;
            BEGIN
                SELECT COUNT(*) INTO v_count FROM SYMBOLS WHERE SYMBOL = :NEW."symbol";
                IF v_count = 0 THEN
                    INSERT INTO SYMBOLS (SYMBOL) VALUES (:NEW."symbol");
                END IF;
            EXCEPTION
                WHEN DUP_VAL_ON_INDEX THEN
                    NULL; -- Secondary safety check
            END;
        `;
        await conn.execute(triggerSql);
        console.log("Trigger 'TRG_AUTO_ADD_SYMBOL' ensured.");

        // 3. Sync existing symbols
        console.log("Syncing symbols from 'historical' to 'SYMBOLS'...");
        const migrationSql = `
            INSERT INTO SYMBOLS (SYMBOL)
            SELECT DISTINCT "symbol" FROM "historical"
            WHERE "symbol" NOT IN (SELECT SYMBOL FROM SYMBOLS)
        `;
        const result = await conn.execute(migrationSql, [], { autoCommit: true });
        console.log(`Repair complete. Rows added to SYMBOLS: ${result.rowsAffected || 0}`);

    } catch (error) {
        console.error("Error during repairSchema:", error);
        throw error;
    }
}
