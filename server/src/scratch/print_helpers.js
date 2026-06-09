import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const target = 'function cw';
const index = content.indexOf(target);
if (index !== -1) {
  console.log('Found function cw at:', index);
  console.log(content.substring(index - 1000, index + 1500));
} else {
  console.log('function cw not found');
}
