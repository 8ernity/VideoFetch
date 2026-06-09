import https from 'https';

// yt-dlp's KVS URL decoding logic, ported to JavaScript
function kvsGetLicenseToken(licenseCode) {
  licenseCode = licenseCode.replace(/\$/g, '');
  const licenseValues = licenseCode.split('').map(c => parseInt(c) || 0);

  const modlicense = licenseCode.replace(/0/g, '1');
  const center = Math.floor(modlicense.length / 2);
  const fronthalf = parseInt(modlicense.substring(0, center + 1));
  const backhalf = parseInt(modlicense.substring(center));
  const modResult = String(4 * Math.abs(fronthalf - backhalf)).substring(0, center + 1);

  const token = [];
  for (let i = 0; i < modResult.length; i++) {
    const current = parseInt(modResult[i]);
    for (let offset = 0; offset < 4; offset++) {
      if (i + offset < licenseValues.length) {
        token.push((licenseValues[i + offset] + current) % 10);
      }
    }
  }
  return token;
}

function kvsGetRealUrl(videoUrl, licenseCode) {
  if (!videoUrl.startsWith('function/0/')) {
    return videoUrl; // not obfuscated
  }

  const rawUrl = videoUrl.substring('function/0/'.length);
  const urlObj = new URL(rawUrl);
  const licenseToken = kvsGetLicenseToken(licenseCode);
  const urlparts = urlObj.pathname.split('/');

  const HASH_LENGTH = 32;
  // Find the hash part (it's the first path segment that's at least 32 chars of hex)
  let hashIndex = -1;
  for (let i = 0; i < urlparts.length; i++) {
    if (urlparts[i].length >= HASH_LENGTH && /^[a-f0-9]+/.test(urlparts[i])) {
      hashIndex = i;
      break;
    }
  }
  
  if (hashIndex < 0) {
    console.error('Could not find hash in URL path:', urlparts);
    return rawUrl;
  }

  const hashStr = urlparts[hashIndex].substring(0, HASH_LENGTH);
  const hashRest = urlparts[hashIndex].substring(HASH_LENGTH);

  console.log('Hash index in path:', hashIndex);
  console.log('Original hash:', hashStr);

  // Create indices array
  const indices = Array.from({ length: HASH_LENGTH }, (_, i) => i);

  // Swap indices according to license token
  let accum = 0;
  for (let src = HASH_LENGTH - 1; src >= 0; src--) {
    accum += licenseToken[src];
    let dest = (src + accum) % HASH_LENGTH;
    [indices[src], indices[dest]] = [indices[dest], indices[src]];
  }

  const newHash = indices.map(index => hashStr[index]).join('');
  console.log('Decoded hash:', newHash);

  urlparts[hashIndex] = newHash + hashRest;
  urlObj.pathname = urlparts.join('/');
  return urlObj.toString();
}

function fetchPage(targetUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      rejectUnauthorized: false
    };
    https.get(targetUrl, options, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

function headCheck(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://pimpbunny.com/',
      },
      rejectUnauthorized: false
    };
    const req = https.request(options, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== Fetching Pimpbunny page ===');
  const pageUrl = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  const html = await fetchPage(pageUrl);
  
  // Parse individual values directly from the page
  const videoUrlMatch = html.match(/video_url:\s*'([^']+)'/);
  const licenseMatch = html.match(/license_code:\s*'([^']+)'/);
  const altUrl1Match = html.match(/video_alt_url:\s*'([^']+)'/);
  const altUrl2Match = html.match(/video_alt_url2:\s*'([^']+)'/);
  
  if (!videoUrlMatch || !licenseMatch) {
    console.error('Could not find video_url or license_code');
    console.log('video_url match:', videoUrlMatch);
    console.log('license match:', licenseMatch);
    return;
  }
  
  const licenseCode = licenseMatch[1];
  console.log('\n=== License Code ===');
  console.log(licenseCode);
  
  const licenseToken = kvsGetLicenseToken(licenseCode);
  console.log('\n=== License Token ===');
  console.log(licenseToken);
  
  // Decode each URL
  const urls = [
    { name: 'video_url', raw: videoUrlMatch[1] },
  ];
  if (altUrl1Match) urls.push({ name: 'video_alt_url', raw: altUrl1Match[1] });
  if (altUrl2Match) urls.push({ name: 'video_alt_url2', raw: altUrl2Match[1] });
  
  for (const { name, raw } of urls) {
    console.log(`\n=== ${name} ===`);
    console.log('Raw:', raw.substring(0, 120));
    const decoded = kvsGetRealUrl(raw, licenseCode);
    console.log('Decoded:', decoded.substring(0, 120));
    
    // HEAD check
    try {
      const result = await headCheck(decoded);
      console.log('HEAD status:', result.status);
      if (result.headers['content-type']) console.log('Content-Type:', result.headers['content-type']);
      if (result.headers['content-length']) console.log('Content-Length:', result.headers['content-length']);
    } catch (err) {
      console.error('HEAD error:', err.message);
    }
  }
}

main().catch(console.error);
