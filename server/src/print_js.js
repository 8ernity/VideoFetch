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
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve({ html, status: res.statusCode }));
    }).on('error', reject);
  });
}

async function main() {
  const url = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  try {
    const { html } = await fetchPage(url);
    const lines = html.split('\n');
    console.log('--- Matching script lines ---');
    lines.forEach((line, i) => {
      if (line.includes('video_url') || line.includes('video_alt_url') || line.includes('function/0/')) {
        console.log(`Line ${i}: ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
