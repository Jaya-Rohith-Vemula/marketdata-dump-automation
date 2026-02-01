import { fetchHistorical } from "./fetchHistorical.js"
import { db } from "./database.js"
import { sleep, parseLine, getResumeEnd, rowToComparable } from "./helper.js"
import type { MarketDataRow } from "./helper.js"

export async function runHistoricalData(symbol: string, interval: number = 2000) {
  let end = await getResumeEnd(symbol)

  while (true) {
    console.log(`[${symbol}] fetching with end:`, end ?? "NONE")

    const data = await fetchHistorical(symbol, end)
    const lines: string[] | undefined =
      typeof data === "string" ? data.trim().split("\n") : (data as any)?.results

    if (!lines || lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
      console.log(`[${symbol}] No more historical data found. Backfill complete.`)
      break
    }

    const parsed: MarketDataRow[] = lines.map((line) => parseLine(line, symbol))

    // Use direct oracledb for bulk insertion to avoid Knex transaction/pool issues
    const { getConn } = await import("./database.js");
    const conn = await getConn();

    console.log(`Inserting ${parsed.length} rows directly via oracledb...`);
    const sql = `
      INSERT INTO "historical" ("symbol", "trade_date", "trade_time", "open", "high", "low", "close", "volume", "datetime")
      SELECT :symbol, :trade_date, :trade_time, :open, :high, :low, :close, :volume, :datetime FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM "historical" 
        WHERE "symbol" = :symbol AND "trade_date" = :trade_date AND "trade_time" = :trade_time
      )
    `;

    // Execute many for efficiency
    await conn.executeMany(sql, parsed, { autoCommit: true });

    if (parsed.length > 0) {
      const firstRow = parsed[0];
      if (firstRow) {
        end = rowToComparable(firstRow)
        console.log(`Inserted ${parsed.length} rows, next end=${end}`)
      }
    }

    await sleep(interval)
  }
}
