import https from 'https';

function fetchPage(targetUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      rejectUnauthorized: false
    };
    https.get(targetUrl, options, (res) => {
      let html = '';
      const cookies = res.headers['set-cookie']
        ? (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [res.headers['set-cookie']]).map(c => c.split(';')[0]).join('; ')
        : '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve({ html, cookies, status: res.statusCode }));
    }).on('error', reject);
  });
}

function testUrl(directUrl, headers) {
  return new Promise((resolve) => {
    console.log(`\nTesting: ${directUrl}`);
    console.log(`Headers: ${JSON.stringify(headers)}`);
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
  const pageUrl = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  try {
    const { html, cookies } = await fetchPage(pageUrl);
    
    // Parse config
    const rndMatch = html.match(/rnd:\s*'([^']+)'/);
    const rnd = rndMatch ? rndMatch[1] : '';
    console.log(`Found rnd: ${rnd}`);
    console.log(`Response Cookies: ${cookies}`);

    const urlMatch = html.match(/video_alt_url3:\s*'([^']+)'/);
    if (!urlMatch) {
      console.log('video_alt_url3 not found');
      return;
    }
    const rawUrl = urlMatch[1];
    console.log(`Raw URL: ${rawUrl}`);

    // Clean URL: strip "function/0/"
    let cleanUrl = rawUrl.replace('function/0/', '');
    
    // Standard cookies list
    const combinedCookies = [cookies, 'age_verified=1; accessAgeDisclaimerPH=1; is_adult=1'].filter(Boolean).join('; ');

    // Test 1: cleanUrl without rnd
    await testUrl(cleanUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': pageUrl,
      'Cookie': combinedCookies
    });

    // Test 2: cleanUrl with rnd parameter
    const cleanUrlWithRnd = cleanUrl.endsWith('/') 
      ? `${cleanUrl.slice(0, -1)}?rnd=${rnd}` 
      : `${cleanUrl}?rnd=${rnd}`;
      
    await testUrl(cleanUrlWithRnd, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': pageUrl,
      'Cookie': combinedCookies
    });

    // Test 3: cleanUrl with rnd but without trailing slash in path, testing different endings
    const cleanUrlRnd2 = cleanUrl.endsWith('/') ? `${cleanUrl}?rnd=${rnd}` : `${cleanUrl}/?rnd=${rnd}`;
    await testUrl(cleanUrlRnd2, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': pageUrl,
      'Cookie': combinedCookies
    });

  } catch (err) {
    console.error(err);
  }
}

main();
