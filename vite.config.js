import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import puppeteer from 'puppeteer';

const cpblScraperPlugin = () => ({
  name: 'cpbl-scraper',
  configureServer(server) {
    server.middlewares.use('/api/cpbl/scrape', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        console.log('[Scraper] 啟動瀏覽器...');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        console.log('[Scraper] 前往中職賽程頁面...');
        await page.goto('https://www.cpbl.com.tw/schedule', { waitUntil: 'networkidle2' });
        
        console.log('[Scraper] 等待賽事資料載入...');
        try {
          await page.waitForSelector('.game_detail', { timeout: 10000 });
        } catch (e) {
          console.warn('[Scraper] 找不到 .game_detail，嘗試直接擷取');
        }

        const gameDatas = await page.evaluate(() => {
          if (window.app && window.app.gameDatas) {
            return window.app.gameDatas;
          }
          return null;
        });

        await browser.close();

        if (gameDatas) {
          console.log(`[Scraper] 成功取得 ${gameDatas.length} 筆賽事資料`);
          res.end(JSON.stringify({ success: true, data: gameDatas }));
        } else {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: 'Cannot find gameDatas in window.app' }));
        }
      } catch (error) {
        console.error('[Scraper] Error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), cpblScraperPlugin()],
  server: {
    open: true,
    proxy: {
      '/api/lala': {
        target: 'https://lala.pythings.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lala/, '')
      }
    }
  }
});
