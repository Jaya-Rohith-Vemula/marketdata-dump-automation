import "dotenv/config"
import { initSchema } from "./database.js"
import { runHistoricalData } from "./runHistoricalData.js"
import { runLatestData } from "./runLatestData.js"
import { shutdown } from "./helper.js"

const SYMBOL = process.env.SYMBOL || "PLTR"

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

  const MODE = process.env.MODE || "historical"; // Options: 'historical' or 'latest'
  console.log(`Starting market data fetch for ${SYMBOL} in ${MODE} mode...`);

  try {
    if (MODE === "latest") {
      console.log("Entering runLatestData...");
      await runLatestData(SYMBOL, 2000);
    } else {
      console.log("Entering runHistoricalData...");
      await runHistoricalData(SYMBOL, 2000);
    }
  } catch (error) {
    console.error(`Error in ${MODE} data run:`, error);
  } finally {
    console.log("Process finished. Shutting down...");
    await shutdown();
  }
}

main();
