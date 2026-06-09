import https from 'https';

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
  if (!videoUrl.startsWith('function/0/')) return videoUrl;
  const rawUrl = videoUrl.substring('function/0/'.length);
  const urlObj = new URL(rawUrl);
  const licenseToken = kvsGetLicenseToken(licenseCode);
  const urlparts = urlObj.pathname.split('/');
  const HASH_LENGTH = 32;
  let hashIndex = -1;
  for (let i = 0; i < urlparts.length; i++) {
    if (urlparts[i].length >= HASH_LENGTH && /^[a-f0-9]+/.test(urlparts[i])) {
      hashIndex = i;
      break;
    }
  }
  if (hashIndex < 0) return rawUrl;
  const hashStr = urlparts[hashIndex].substring(0, HASH_LENGTH);
  const hashRest = urlparts[hashIndex].substring(HASH_LENGTH);
  const indices = Array.from({ length: HASH_LENGTH }, (_, i) => i);
  let accum = 0;
  for (let src = HASH_LENGTH - 1; src >= 0; src--) {
    accum += licenseToken[src];
    let dest = (src + accum) % HASH_LENGTH;
    [indices[src], indices[dest]] = [indices[dest], indices[src]];
  }
  const newHash = indices.map(index => hashStr[index]).join('');
  urlparts[hashIndex] = newHash + hashRest;
  urlObj.pathname = urlparts.join('/');
  return urlObj.toString();
}

function httpReq(url, method, referer) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': '*/*',
      },
      rejectUnauthorized: false
    };
    const req = https.request(options, (res) => {
      if (method === 'HEAD') {
        resolve({ status: res.statusCode, headers: res.headers });
      } else {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
      }
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const pageUrl = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  console.log('Fetching page:', pageUrl);
  const { data: html } = await httpReq(pageUrl, 'GET', 'https://www.google.com/');

  const videoUrlMatch = html.match(/video_url:\s*'([^']+)'/);
  const licenseMatch = html.match(/license_code:\s*'([^']+)'/);
  
  if (!videoUrlMatch || !licenseMatch) {
    console.error('Missing video_url or license_code');
    return;
  }

  const rawUrl = videoUrlMatch[1];
  const licenseCode = licenseMatch[1];
  console.log('Raw URL:', rawUrl);
  console.log('License:', licenseCode);

  const decoded = kvsGetRealUrl(rawUrl, licenseCode);
  console.log('Decoded:', decoded);

  // Test with proper referer (the video page itself)
  console.log('\n--- HEAD with page referer ---');
  const r1 = await httpReq(decoded, 'HEAD', pageUrl);
  console.log('Status:', r1.status, 'Location:', r1.headers.location);

  if (r1.status === 302 && r1.headers.location) {
    console.log('\n--- Following redirect ---');
    const r2 = await httpReq(r1.headers.location, 'HEAD', pageUrl);
    console.log('CDN Status:', r2.status);
    console.log('CDN Content-Type:', r2.headers['content-type']);
    console.log('CDN Content-Length:', r2.headers['content-length']);
  }

  // Also test the raw URL without decode (just strip function/0/)
  const naiveUrl = rawUrl.substring('function/0/'.length);
  console.log('\n--- Naive (no decode) HEAD ---');
  const r3 = await httpReq(naiveUrl, 'HEAD', pageUrl);
  console.log('Status:', r3.status);
}

main().catch(console.error);
