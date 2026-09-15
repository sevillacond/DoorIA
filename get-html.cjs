const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  const content = await page.content();
  console.log("HTML length:", content.length);
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log("Root content:", rootHtml.substring(0, 500));
  
  await browser.close();
})();
