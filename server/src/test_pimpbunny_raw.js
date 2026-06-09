import { customExtractor } from './services/ytdlp.js';
import https from 'https';
import dns from 'dns';

function secureDnsLookup(hostname, opts, callback) {
  const resolver = new dns.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  resolver.resolve4(hostname, (err, addresses) => {
    if (err || addresses.length === 0) return dns.lookup(hostname, opts, callback);
    if (opts.all) {
      callback(null, [{ address: addresses[0], family: 4 }]);
    } else {
      callback(null, addresses[0], 4);
    }
  });
}

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
    console.log('--- Match patterns ---');
    const keys = ['video_url', 'video_alt_url', 'video_alt_url2', 'video_alt_url3', 'video_alt_url4', 'video_alt_url5'];
    keys.forEach(k => {
      const match = html.match(new RegExp(`${k}:\\s*'([^']+)'`));
      if (match) {
        console.log(`${k}: ${match[1]}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
