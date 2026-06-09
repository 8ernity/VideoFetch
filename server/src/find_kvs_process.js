import https from 'https';

function downloadJs() {
  return new Promise((resolve, reject) => {
    https.get('https://pimpbunny.com/player/kt_player.js?v=9.5.7', { rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const code = await downloadJs();
    console.log('Downloaded kt_player.js');

    // Find occurrences of "video_url" or "video_alt_url" or "function/0" in kt_player.js
    const words = ['video_url', 'video_alt_url', 'function/'];
    words.forEach(word => {
      console.log(`\n--- Searching for "${word}" ---`);
      let pos = 0;
      let count = 0;
      while ((pos = code.indexOf(word, pos)) !== -1) {
        count++;
        console.log(`Match ${count} at pos ${pos}:`);
        console.log(code.substring(Math.max(0, pos - 100), Math.min(code.length, pos + 200)));
        pos += word.length;
        if (count > 5) break; // Limit output
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
