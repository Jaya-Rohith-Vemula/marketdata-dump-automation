import "dotenv/config"
import { chromium } from "playwright"
import type { Browser, BrowserContext, Page, Request } from "playwright"

class AuthManager {
  private cookie: string | null = null;
  private xsrfToken: string | null = null;
  private usageCount: number = 0;
  private maxUsage: number = 15;
  private refreshing: Promise<void> | null = null;

  async refresh(): Promise<void> {
    // Prevent parallel refreshes
    if (this.refreshing) {
      return this.refreshing
    }

    this.refreshing = (async () => {
      const browser: Browser = await chromium.launch({ headless: true })

      const context: BrowserContext = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      })

      const page: Page = await context.newPage()

      let token: string | null = null

      page.on("request", (req: Request) => {
        const h = req.headers();
        if (req.url().includes("/proxies/") && h["x-xsrf-token"]) {
          token = h["x-xsrf-token"] as string;
        }
      })

      const symbol = process.env.SYMBOL
      await page.goto(
        `${process.env.DOMAIN}/stocks/quotes/${symbol}/interactive-chart`,
        { waitUntil: "domcontentloaded" },
      )

      await page.waitForTimeout(4000)

      const cookies = await context.cookies()
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

      await browser.close()

      if (!token) {
        throw new Error("Failed to capture x-xsrf-token")
      }

      this.cookie = cookieHeader
      this.xsrfToken = token
      this.usageCount = 0

      this.refreshing = null
    })()

    return this.refreshing
  }

  async getAuthHeaders(): Promise<{ cookie: string; "x-xsrf-token": string }> {
    if (!this.cookie || !this.xsrfToken || this.usageCount >= this.maxUsage) {
      console.log("Refreshing auth tokens because...", {
        noCookie: !this.cookie,
        noXsrf: !this.xsrfToken,
        usageCount: this.usageCount,
        maxUsage: this.maxUsage,
      })
      await this.refresh()
    }

    this.usageCount++

    console.log(`Using auth tokens (usage count: ${this.usageCount})`)
    return {
      cookie: this.cookie as string,
      "x-xsrf-token": this.xsrfToken as string,
    }
  }

  invalidate(): void {
    console.log("Invalidating auth tokens...")
    this.cookie = null
    this.xsrfToken = null
    this.usageCount = this.maxUsage
  }
}

export const authManager = new AuthManager()
