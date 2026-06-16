import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.cpbl.com.tw/schedule', { waitUntil: 'networkidle2' });
  const data = await page.evaluate(() => window.app.gameDatas.slice(0, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

test();
