import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const start = 123000;
const length = 2500;
console.log(content.substring(start, start + length));
