import https from 'https';

function followRedirect(url) {
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
      resolve({ status: res.statusCode, location: res.headers.location, headers: res.headers });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const url = 'https://pimpbunny.com/get_file/37/4a827c8f8caa8d50c81c20fc93bcf1cf92713efe65/551000/551152/551152_360p.mp4/';
  console.log('Testing decoded URL:', url);
  const r1 = await followRedirect(url);
  console.log('Status:', r1.status);
  console.log('Location:', r1.location);
  if (r1.location) {
    const r2 = await followRedirect(r1.location);
    console.log('CDN Status:', r2.status);
    console.log('CDN Content-Type:', r2.headers['content-type']);
    console.log('CDN Content-Length:', r2.headers['content-length']);
  }
}

main().catch(console.error);
