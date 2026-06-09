import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

console.log('File length:', content.length);
console.log('Contains "kt_player":', content.includes('kt_player'));
console.log('Contains "player_obj":', content.includes('player_obj'));
console.log('Contains "function/0":', content.includes('function/0'));
console.log('Contains "function/":', content.includes('function/'));

// Find all indices of "function" in the code
let pos = 0;
let count = 0;
while ((pos = content.indexOf('function', pos)) !== -1) {
  count++;
  pos += 8;
}
console.log('Total occurrences of "function":', count);
