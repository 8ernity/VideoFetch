import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const target = 'var f=["';
const index = content.indexOf(target);
if (index !== -1) {
  console.log('Found f array at index:', index);
  console.log(content.substring(index, index + 3000));
} else {
  console.log('f array not found');
}
