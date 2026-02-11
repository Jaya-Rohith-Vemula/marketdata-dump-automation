import { fetchHistorical } from "./fetchHistorical.js"
import { db } from "./database.js"
import { sleep, parseLine, getLatestEnd, rowToComparable } from "./helper.js"
import type { MarketDataRow } from "./helper.js"

export async function runLatestData(symbol: string, interval: number = 2000) {
  const latestEnd = await getLatestEnd(symbol)

  console.log(`[${symbol}] DB latest:`, latestEnd ?? "NONE")

  let end: string | null = null
  let totalInserted = 0

  while (true) {
    console.log(`[${symbol}] fetching page end=`, end ?? "LATEST")

    const data = await fetchHistorical(symbol, end)
    const lines: string[] | undefined =
      typeof data === "string" ? data.trim().split("\n") : (data as any)?.results

    if (!lines || lines.length === 0) {
      console.log("No more data")
      break
    }

    const parsed: MarketDataRow[] = lines.map((l) => parseLine(l, symbol))

    const newRows = parsed.filter((row) => {
      if (!latestEnd) return true
      return rowToComparable(row) > latestEnd
    })

    if (newRows.length === 0) {
      console.log("Reached existing DB data, stopping")
      break
    }

    // Use direct oracledb for bulk insertion to avoid Knex transaction/pool issues
    const { getConn } = await import("./database.js");
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

    // Execute many for efficiency
    await conn.executeMany(sql, newRows, { autoCommit: true });

    totalInserted += newRows.length

    console.log(`Inserted ${newRows.length} rows`)

    await sleep(interval)

    // paginate backward using OLDEST row in this batch
    if (parsed.length > 0) {
      const oldest = parsed[0]
      if (oldest) {
        console.log(`[${symbol}] oldest in batch: ${oldest.datetime}, setting end for next page`)
        end = rowToComparable(oldest)
      }
    }

    // safety stop: if new rows < parsed rows, no more pages
    if (latestEnd && newRows.length < parsed.length) {
      console.log("Overlap with existing DB detected, stopping")
      break
    }
  }

  console.log(`[${symbol}] update complete. Total inserted: ${totalInserted}`)
}
