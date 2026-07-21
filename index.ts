import "dotenv/config"
import { initSchema } from "./database.js"
import { runSync } from "./runSync.js"
import { shutdown } from "./helper.js"

const SYMBOL = process.env.SYMBOL || "PLTR"
// Only needed for a brand-new symbol's first run (e.g. "2010-01-04").
// Every subsequent run resumes from SYMBOLS.SYNCED_THROUGH automatically.
const START_DATE = process.env.START_DATE || null
const WINDOW_DAYS = process.env.WINDOW_DAYS ? Number(process.env.WINDOW_DAYS) : 5

process.on("SIGINT", async () => {
  console.log("\nSIGINT received. Shutting down gracefully...")
  await shutdown()
})

process.on("SIGTERM", async () => {
  console.log("\nSIGTERM received. Shutting down gracefully...")
  await shutdown()
})

async function main() {
  console.log("Main function started.");

  // Initialize Oracle Schema first
  try {
    console.log("Calling initSchema...");
    await initSchema();
    console.log("initSchema completed successfully.");
  } catch (err) {
    console.error("Failed to initialize schema. Exiting...");
    process.exit(1);
  }

  console.log(`Starting market data sync for ${SYMBOL} (windowDays=${WINDOW_DAYS})...`);

  try {
    await runSync(SYMBOL, START_DATE, WINDOW_DAYS, 2000);
  } catch (error) {
    console.error(`Error during sync for ${SYMBOL}:`, error);
  } finally {
    console.log("Process finished. Shutting down...");
    await shutdown();
  }
}

main();
