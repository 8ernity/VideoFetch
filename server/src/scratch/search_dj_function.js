import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const target = 'function dj(';
let pos = content.indexOf(target);
if (pos !== -1) {
  console.log('Found function dj at:', pos);
  console.log(content.substring(pos, pos + 2000));
} else {
  console.log('function dj not found');
  // Try searching for "dj("
  let pos2 = 0;
  while ((pos2 = content.indexOf('dj(', pos2)) !== -1) {
    console.log(`dj( found at ${pos2}:`, content.substring(pos2 - 50, pos2 + 150));
    pos2 += 3;
  }
}
