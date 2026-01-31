import knex, { Knex } from "knex";
import "dotenv/config";

// We use "any" for the config to avoid strict Knex + Oracle type conflicts 
// especially when host/port are omitted in favor of connectString/walletLocation.
const dbConfig: any = {
    client: "oracledb",
    connection: {
        user: process.env.DB_USER || "ADMIN",
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING,
        walletLocation: process.env.TNS_ADMIN,
    },
    pool: { min: 2, max: 10 },
};

export const db: Knex = knex(dbConfig);

export async function initSchema() {
    const exists = await db.schema.hasTable("historical");
    if (!exists) {
        await db.schema.createTable("historical", (table) => {
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
}
