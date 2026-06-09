import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// Find function cw( or cw =
let pos = 0;
while ((pos = content.indexOf('cw', pos)) !== -1) {
  console.log(`Found cw at ${pos}:`);
  console.log(content.substring(pos - 50, pos + 150));
  pos += 2;
}
