import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// Search for kt_player occurrences
let pos = 0;
console.log('--- Occurrences of kt_player ---');
while ((pos = content.indexOf('kt_player', pos)) !== -1) {
  console.log(`Found kt_player at index ${pos}:`);
  console.log(content.substring(Math.max(0, pos - 150), Math.min(content.length, pos + 250)));
  console.log('--------------------------------');
  pos += 'kt_player'.length;
}

// Let's search for "split('/')" or similar
console.log('\n--- Searching for URL parsing or splitting ---');
const matchWord = 'get_file';
pos = 0;
while ((pos = content.indexOf(matchWord, pos)) !== -1) {
  console.log(`Found "${matchWord}" at index ${pos}:`);
  console.log(content.substring(pos - 100, pos + 200));
  pos += matchWord.length;
}
