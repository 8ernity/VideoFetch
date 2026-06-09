import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const start = content.indexOf('function kt_player(');
if (start !== -1) {
  console.log('Found kt_player at:', start);
  console.log(content.substring(start, start + 3000));
} else {
  console.log('kt_player function not found');
}
