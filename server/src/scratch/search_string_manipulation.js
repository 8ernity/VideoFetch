import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// Let's search for any occurrence of "function" within quotes, e.g. 'function' or "function"
console.log('--- Searching for "function" in quotes ---');
const regex = /['"]function['"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Found "function" at index ${match.index}:`);
  console.log(content.substring(match.index - 50, match.index + 150));
}

// Let's search for any occurrence of "function/" or constructed string for it
console.log('--- Searching for "func" or "tion" or "0/" ---');
const words = ['func', 'tion/', 'ction/'];
words.forEach(word => {
  let pos = 0;
  while ((pos = content.indexOf(word, pos)) !== -1) {
    console.log(`Found "${word}" at ${pos}:`);
    console.log(content.substring(pos - 100, pos + 100));
    pos += word.length;
  }
});
