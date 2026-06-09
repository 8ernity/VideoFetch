import fs from 'fs';
import path from 'path';
import https from 'https';

async function main() {
  const filePath = path.join(process.cwd(), 'inspect_kt_player.js'); 
  
  const downloadJs = () => new Promise((resolve, reject) => {
    https.get('https://pimpbunny.com/player/kt_player.js?v=9.5.7', { rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });

  try {
    const code = await downloadJs();
    console.log('Downloaded kt_player.js code');
    
    // Find references to "function/"
    const regex = /"function\/[^"]+"|'function\/[^']+'/g;
    let match;
    console.log('--- Matching Literal Strings ---');
    while ((match = regex.exec(code)) !== null) {
      console.log(match[0]);
    }

    // Let's search for how the player parses "function/" URLs
    // Let's search for "function/" in the code
    const index = code.indexOf('function/');
    if (index !== -1) {
      console.log('\n--- Surrounding Context ---');
      console.log(code.substring(index - 200, index + 300));
    } else {
      console.log('Substring "function/" not found directly.');
    }
  } catch (err) {
    console.error(err);
  }
}

main();
