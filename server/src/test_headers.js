import https from 'https';
import { getVideoInfo } from './services/ytdlp.js';

async function testUrl(directUrl, headers) {
  return new Promise((resolve) => {
    console.log(`\nTesting with headers: ${JSON.stringify(headers)}`);
    const parsed = new URL(directUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: headers,
      rejectUnauthorized: false,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
      res.destroy();
      resolve(res.statusCode);
    });

    req.on('error', (e) => {
      console.log(`Request Error: ${e.message}`);
      resolve(null);
    });

    req.end();
  });
}

async function main() {
  const url = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  try {
    const info = await getVideoInfo(url);
    const format = info.formats[0];
    const [_, directUrl, cookies] = format.format_id.split('|');
    console.log(`Direct URL: ${directUrl}`);
    console.log(`Cookies: ${cookies}`);

    // Try 1: Standard headers
    await testUrl(directUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': url,
      'Cookie': cookies
    });

    const slicedUrl = directUrl.endsWith('/') ? directUrl.slice(0, -1) : directUrl;
    console.log(`\n--- Testing without trailing slash: ${slicedUrl} ---`);
    await testUrl(slicedUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': url,
      'Cookie': cookies
    });

    // Try 4: Mobile User-Agent + clean referer
    await testUrl(directUrl, {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Referer': 'https://pimpbunny.com/',
      'Cookie': cookies
    });

    // Try 5: Standard desktop UA, no cookies, Referer = https://pimpbunny.com/
    await testUrl(directUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': 'https://pimpbunny.com/'
    });

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
