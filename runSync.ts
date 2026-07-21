import { fetchHistorical } from "./fetchHistorical.js"
import { db } from "./database.js"
import {
  sleep,
  parseLine,
  rowToComparable,
  comparableFromDate,
  parseComparable,
  addDays,
  formatComparable,
} from "./helper.js"
import type { MarketDataRow } from "./helper.js"

async function getSyncedThrough(symbol: string): Promise<string | null> {
  const { getConn } = await import("./database.js")
  const conn = await getConn()
  const row = await db("SYMBOLS").where({ SYMBOL: symbol }).first().connection(conn)
  return (row?.SYNCED_THROUGH as string) || null
}

async function setSyncedThrough(symbol: string, value: string) {
  const { getConn } = await import("./database.js")
  const conn = await getConn()
  await conn.execute(
    `UPDATE SYMBOLS SET SYNCED_THROUGH = :value WHERE SYMBOL = :symbol`,
    { value, symbol },
    { autoCommit: true }
  )
}

// For symbols that already have historical rows from before SYNCED_THROUGH existed.
// Bootstraps the checkpoint from the newest row on record — assumes that existing
// data has no undetected gaps, since we have no other record of its true completeness.
async function getExistingMaxComparable(symbol: string): Promise<string | null> {
  const { getConn } = await import("./database.js")
  const conn = await getConn()
  const row = await db("historical")
    .where({ symbol })
    .orderBy("trade_date", "desc")
    .orderBy("trade_time", "desc")
    .first()
    .connection(conn)
  return row ? rowToComparable(row as MarketDataRow) : null
}

export async function runSync(
  symbol: string,
  startDate: string | null,
  windowDays: number = 5,
  interval: number = 2000
) {
  let checkpoint = await getSyncedThrough(symbol)

  if (checkpoint) {
    console.log(`[${symbol}] resuming from checkpoint: ${formatComparable(checkpoint)}`)
  } else {
    const existingMax = await getExistingMaxComparable(symbol)
    if (existingMax) {
      checkpoint = existingMax
      console.log(
        `[${symbol}] no SYNCED_THROUGH yet, but existing historical data found. ` +
        `Bootstrapping checkpoint from its latest row: ${formatComparable(checkpoint)} (assumes no undetected gaps in existing data).`
      )
      await setSyncedThrough(symbol, checkpoint)
    } else if (startDate) {
      checkpoint = comparableFromDate(new Date(startDate))
      console.log(`[${symbol}] no existing data found. Seeding checkpoint from START_DATE: ${formatComparable(checkpoint)}`)
      await setSyncedThrough(symbol, checkpoint)
    } else {
      throw new Error(
        `[${symbol}] no existing data and no START_DATE provided. Supply the symbol's earliest known trading date via START_DATE for its first run.`
      )
    }
  }

  let totalInserted = 0

  while (true) {
    const checkpointDate = parseComparable(checkpoint)
    const now = new Date()

    const windowEndDate = addDays(checkpointDate, windowDays)
    const reachedNow = windowEndDate >= now
    const cappedEndDate = reachedNow ? now : windowEndDate
    const end = comparableFromDate(cappedEndDate)

    console.log(`[${symbol}] fetching window ${formatComparable(checkpoint)} -> ${formatComparable(end)}${reachedNow ? " (final window, reaches current time)" : ""}`)

    const data = await fetchHistorical(symbol, end)
    const lines: string[] | undefined =
      typeof data === "string" ? data.trim().split("\n") : (data as any)?.results

    const validLines = (lines ?? []).filter((l) => l && l.trim().length > 0)

    if (validLines.length > 0) {
      const parsed: MarketDataRow[] = validLines.map((line) => parseLine(line, symbol))

      const { getConn } = await import("./database.js")
      const conn = await getConn()

      const sql = `
        INSERT INTO "historical" ("symbol", "trade_date", "trade_time", "open", "high", "low", "close", "volume", "datetime")
        SELECT :symbol, :trade_date, :trade_time, :open, :high, :low, :close, :volume, :datetime FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM "historical"
          WHERE "symbol" = :symbol AND "trade_date" = :trade_date AND "trade_time" = :trade_time
        )
      `

      const result = await conn.executeMany(sql, parsed, { autoCommit: true })
      const actuallyInserted = typeof result.rowsAffected === "number" ? result.rowsAffected : 0
      totalInserted += actuallyInserted

      console.log(`[${symbol}] fetched ${parsed.length} rows for window ${formatComparable(checkpoint)} -> ${formatComparable(end)}, ${actuallyInserted} newly inserted`)
    } else {
      console.log(`[${symbol}] no data returned for window ${formatComparable(checkpoint)} -> ${formatComparable(end)} (likely a non-trading period)`)
    }

    checkpoint = end
    await setSyncedThrough(symbol, checkpoint)

    if (reachedNow) {
      console.log(`[${symbol}] reached current time. Sync complete. Total newly inserted: ${totalInserted}`)
      break
    }

    await sleep(interval)
  }
}
