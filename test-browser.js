import puppeteer from 'puppeteer';
import { createServer } from 'vite';

(async () => {
  const server = await createServer({
    server: { port: 5176 },
  });
  await server.listen();

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[Browser Error] ${error.message}`);
  });

  await page.goto('http://localhost:5176');
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
  await server.close();
})();
