import { getConn, db, closeConn, initSchema } from "./database.js";
import "dotenv/config";

async function testConnection() {
    console.log("--- Database Connection Test ---");

    try {
        // Step 1: Test raw Oracle connection
        console.log("\n1. Testing raw Oracle connection...");
        const conn = await getConn();
        console.log("SUCCESS: Raw connection established.");

        // Step 2: Test basic query via Knex
        console.log("\n2. Testing Knex query (SELECT 1 FROM DUAL)...");
        const result = await db.raw("SELECT 1 AS TEST FROM DUAL").connection(conn);
        console.log("SUCCESS: Query returned:", result);

        // Step 3: Test schema initialization
        console.log("\n3. Testing schema initialization/check...");
        await initSchema();
        console.log("SUCCESS: Schema check/init complete.");

        console.log("\n--- All tests passed! ---");
    } catch (error: any) {
        console.error("\nFAILED: Database test failed!");
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);

        if (error.message.includes("ORA-")) {
            console.error("\nOracle specific error detected. Please check your credentials and TNS configuration.");
        }
    } finally {
        console.log("\nClosing connection...");
        await closeConn();
        process.exit(0);
    }
}

testConnection();
