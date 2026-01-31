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
  // Initialize Oracle Schema first
  await initSchema();

  const MODE = process.env.MODE || "historical"; // Options: 'historical' or 'latest'
  console.log(`Starting market data fetch for ${SYMBOL} in ${MODE} mode...`);

  try {
    if (MODE === "latest") {
      await runLatestData(SYMBOL, 2000);
    } else {
      await runHistoricalData(SYMBOL, 2000);
    }
  } catch (error) {
    console.error(`Error in ${MODE} data run:`, error);
    await shutdown();
  }
}

main();
