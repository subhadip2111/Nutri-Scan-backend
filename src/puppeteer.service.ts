import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as puppeteer from 'puppeteer';
import { lastValueFrom } from 'rxjs';

interface SearchResult {
  url: string;
  title?: string;
  snippet?: string;
  content?: string | null;
}

@Injectable()
export class GooglePuppeteerService {
  private readonly logger = new Logger(GooglePuppeteerService.name);

  // Load from environment variables, fallback to empty strings if missing
  private readonly googleApiKey: string = process.env.GOOGLE_API_KEY || '';
  private readonly googleCseId: string = process.env.GOOGLE_CSE_ID || '';

  constructor(private readonly httpService: HttpService) {}

  private async googleSearch(query: string, numResults = 5): Promise<SearchResult[]> {
    this.logger.log(`Performing Google search for query: "${query}"`);

    if (!this.googleApiKey || !this.googleCseId) {
      this.logger.error('Google API key or CSE ID is missing. Please set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.');
      return [];
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: this.googleApiKey,
      cx: this.googleCseId,
      q: query,
      num: numResults,
    };

    try {
      const response$ = this.httpService.get(url, { params });
      const response = await lastValueFrom(response$);

      const items = response.data.items || [];

      return items.map((item: any) => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet,
      }));
    } catch (error: any) {
      this.logger.error(`Google Search API error: ${error.message || error.toString()}`);
      return [];
    }
  }

  /**
   * Scrape text content from a URL.
   * If selector is provided, extract text from that element.
   * Otherwise, extract full page body text.
   */
  private async scrapePageContent(url: string, selector?: string): Promise<string | null> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const content = selector
        ? await page.$eval(selector, (el) => el.textContent?.trim() || null)
        : await page.evaluate(() => document.body.textContent?.trim() || null);

      return content;
    } catch (error: any) {
      this.logger.warn(`Failed to scrape ${url}: ${error.message || error.toString()}`);
      return null;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Search Google and scrape content from each result URL.
   * @param query Search query string
   * @param selector Optional CSS selector to extract specific content from the page
   * @param maxResults Number of search results to process (default 5)
   */
  async searchAndScrape(query: string, selector?: string, maxResults = 5): Promise<SearchResult[]> {
    this.logger.log(`Starting search and scrape for query: "${query}"`);

    const searchResults = await this.googleSearch(query, maxResults);
    const resultsWithContent: SearchResult[] = [];

    for (const result of searchResults) {
      this.logger.log(`Scraping content from: ${result.url}`);
      const content = await this.scrapePageContent(result.url, selector);
      resultsWithContent.push({
        ...result,
        content,
      });
    }

    return resultsWithContent;
  }

  /**
   * Helper method to search multiple queries sequentially.
   * @param queries Array of query strings
   * @param selector Optional CSS selector
   * @param maxResults Number of results per query
   */
  async searchMultipleAndScrape(
    queries: string[],
    selector?: string,
    maxResults = 5
  ): Promise<SearchResult[][]> {
    const allResults: SearchResult[][] = [];

    for (const query of queries) {
      this.logger.log(`Processing query: "${query}"`);
      const results = await this.searchAndScrape(query, selector, maxResults);
      allResults.push(results);
    }

    return allResults;
  }
}
