import { db } from "./database.js"

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let shutdownInProgress = false

export async function shutdown() {
  if (shutdownInProgress) return
  shutdownInProgress = true

  try {
    console.log("Closing database...")
    const { closeConn } = await import("./database.js");
    await closeConn();
    await db.destroy();
    console.log("Database closed.");
  } catch (err: any) {
    console.error("Shutdown error:", err.message)
  } finally {
    process.exit(0)
  }
}

export interface MarketDataRow {
  symbol: string;
  trade_date: string;
  trade_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: string;
}

export function parseLine(line: string, symbol: string): MarketDataRow {
  const [datetime, , open, high, low, close, volume] = line.split(",")

  if (!datetime) {
    return {
      symbol,
      trade_date: "",
      trade_time: "",
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      datetime: "",
    }
  }

  const [date, time] = datetime.split(" ")

  return {
    symbol,
    trade_date: date || "",
    trade_time: time || "",
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
    datetime: datetime || "",
  }
}

export function rowToComparable(row: MarketDataRow): string {
  return (row.datetime || "").replace(/[-:\s]/g, "") + "00"
}

export async function getResumeEnd(symbol: string): Promise<string | null> {
  console.log(`[${symbol}] querying for earliest record (resume end)...`);
  try {
    const { getConn } = await import("./database.js");
    const conn = await getConn();
    const row = await db("historical")
      .where({ symbol })
      .orderBy("trade_date", "asc")
      .orderBy("trade_time", "asc")
      .first()
      .connection(conn);

    const result = row ? rowToComparable(row as MarketDataRow) : null;
    console.log(`[${symbol}] earliest record found: ${result ?? "NONE"}`);
    return result;
  } catch (error) {
    console.error(`[${symbol}] Error querying getResumeEnd:`, error);
    throw error;
  }
}

export async function getLatestEnd(symbol: string): Promise<string | null> {
  console.log(`[${symbol}] querying for latest record...`);
  try {
    const { getConn } = await import("./database.js");
    const conn = await getConn();
    const row = await db("historical")
      .where({ symbol })
      .orderBy("trade_date", "desc")
      .orderBy("trade_time", "desc")
      .first()
      .connection(conn);

    const result = row ? rowToComparable(row as MarketDataRow) : null;
    console.log(`[${symbol}] latest record found: ${result ?? "NONE"}`);
    return result;
  } catch (error) {
    console.error(`[${symbol}] Error querying getLatestEnd:`, error);
    throw error;
  }
}
