import "dotenv/config"
import axios from "axios"
import { authManager } from "./authManager.js"

export async function fetchHistorical(symbol: string, end: string | null, retry: boolean = true): Promise<any> {
  const authHeaders = await authManager.getAuthHeaders()

  const url = `${process.env.DOMAIN}/proxies/timeseries/historical/queryminutes.ashx`

  const params: any = {
    symbol: symbol,
    maxrecords: 5000,
    volume: "contract",
    order: "asc",
    dividends: false,
    backadjust: false,
    daystoexpiration: 1,
    contractroll: "combined",
    formt: true,
    splits: true,
    padded: false,
  }

  if (end != null) {
    params.end = end
  }

  const headers = {
    Accept: "application/json",
    "accept-language": "en-US,en;q=0.9",
    dnt: "1",
    priority: "u=1, i",
    referer: `${process.env.DOMAIN}/stocks/quotes/${symbol}/interactive-chart`,
    "sec-ch-ua":
      '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    ...authHeaders,
  }

  try {
    const res = await axios.get(url, { params, headers })
    return res.data
  } catch (err: any) {
    if (retry) {
      console.log("error fetching historical data:", err.message, "retrying...")
      // Invalidate auth and retry once
      authManager.invalidate()
      return fetchHistorical(symbol, end, false) // retry = false to prevent infinite loop
    }
    throw err
  }
}
