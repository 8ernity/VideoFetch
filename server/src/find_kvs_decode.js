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

    // KVS decryption often uses a function that iterates charCodeAt or substring
    // Let's find all function definitions that match something like 'function(e,t)' or 'function(e)' 
    // and see if they contain substring or charCodeAt
    const lines = code.split(';');
    console.log('Searching for candidate functions in kt_player.js...');
    lines.forEach((line) => {
      if (line.includes('charCodeAt') && line.includes('String.fromCharCode')) {
        console.log('\nFound charCodeAt + String.fromCharCode match:');
        console.log(line.substring(0, 500));
      }
      if (line.includes('split') && line.includes('function/')) {
        console.log('\nFound split + function/ match:');
        console.log(line.substring(0, 500));
      }
      if (line.includes('substring') && line.includes('charCodeAt')) {
        console.log('\nFound substring + charCodeAt match:');
        console.log(line.substring(0, 500));
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
