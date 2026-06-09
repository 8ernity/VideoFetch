import https from 'https';
import fs from 'fs';
import path from 'path';

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
    console.log(`Downloaded kt_player.js, size: ${code.length}`);
    fs.writeFileSync(path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js'), code);
    
    // Look for functions in the JS
    // Often there's a decryption function or string processing
    // Let's search for "license_code"
    const licensePos = code.indexOf('license_code');
    if (licensePos !== -1) {
      console.log('Found license_code at:', licensePos);
      console.log(code.substring(licensePos - 100, licensePos + 200));
    }
  } catch (err) {
    console.error(err);
  }
}

main();
