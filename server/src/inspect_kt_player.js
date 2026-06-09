import https from 'https';

function fetchPage(targetUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://pimpbunny.com/',
        'Accept': '*/*',
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
  const url = 'https://pimpbunny.com/player/kt_player.js?v=9.5.7';
  try {
    const { html } = await fetchPage(url);
    console.log(`Downloaded ${html.length} bytes of kt_player.js`);
    
    // Search for functions or strings related to "function/" URL modification
    const lines = html.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('function/') || line.includes('split') || line.includes('replace') || line.includes('kt_player') || line.includes('decode') || line.includes('decrypt')) {
        console.log(`Line ${i}: ${line.trim().substring(0, 300)}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
