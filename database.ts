import knex from "knex";
import type { Knex } from "knex";
import oracledb from "oracledb";
import "dotenv/config";

// We use "any" for the config to avoid strict Knex + Oracle type conflicts 
// especially when host/port are omitted in favor of connectString/walletLocation.
console.log("Initializing database connection...");
console.log("DB_USER:", process.env.DB_USER || "ADMIN");
console.log("DB_CONNECT_STRING:", process.env.DB_CONNECT_STRING ? "REDACTED" : "NOT SET");
console.log("TNS_ADMIN (Wallet Location):", process.env.TNS_ADMIN || "NOT SET");

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
        walletLocation: process.env.TNS_ADMIN!,
        walletPassword: process.env.DB_PASSWORD!,
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
    console.log("Initializing schema...");
    const conn = await getConn();

    console.log("Checking if 'historical' table exists...");
    try {
        const exists = await db.schema.connection(conn).hasTable("historical");
        console.log(`'historical' table exists: ${exists}`);
        if (!exists) {
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

            console.log("Oracle Table 'historical' created.");
        }
    } catch (error) {
        console.error("Error during initSchema:", error);
        throw error;
    }
}
