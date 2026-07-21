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

// Comparable strings are 14-digit yyyyMMddHHmmss (see rowToComparable above).
export function comparableFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  )
}

export function parseComparable(comparable: string): Date {
  const y = Number(comparable.slice(0, 4))
  const mo = Number(comparable.slice(4, 6)) - 1
  const d = Number(comparable.slice(6, 8))
  const h = Number(comparable.slice(8, 10))
  const mi = Number(comparable.slice(10, 12))
  const s = Number(comparable.slice(12, 14))
  return new Date(y, mo, d, h, mi, s)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// For logging only — turns a 14-digit yyyyMMddHHmmss comparable into "YYYY-MM-DD HH:mm:ss".
export function formatComparable(comparable: string): string {
  return (
    `${comparable.slice(0, 4)}-${comparable.slice(4, 6)}-${comparable.slice(6, 8)} ` +
    `${comparable.slice(8, 10)}:${comparable.slice(10, 12)}:${comparable.slice(12, 14)}`
  )
}
