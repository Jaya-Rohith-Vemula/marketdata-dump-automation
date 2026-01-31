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

    if (!lines || lines.length === 0) {
      console.log("No new data")
      await sleep(interval)
      continue
    }

    const parsed: MarketDataRow[] = lines.map((line) => parseLine(line, symbol))

    await db.transaction(async (trx) => {
      for (const row of parsed) {
        await trx("historical")
          .insert(row)
          .onConflict(["symbol", "trade_date", "trade_time"])
          .ignore()
      }
    })

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
