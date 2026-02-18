import { repairSchema, closeConn } from "./database.js";
import { db } from "./database.js";

async function runRepair() {
    try {
        await repairSchema();
        console.log("Database repair successful.");
    } catch (error) {
        console.error("Database repair failed:", error);
    } finally {
        await closeConn();
        await db.destroy();
        process.exit(0);
    }
}

runRepair();
