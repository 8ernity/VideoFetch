import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// Find function cw
const targets = [
  'function cw(',
  'cw=function(',
  'cw = function(',
  ' cw('
];

targets.forEach(target => {
  let pos = 0;
  while ((pos = content.indexOf(target, pos)) !== -1) {
    console.log(`Found target "${target}" at ${pos}:`);
    console.log(content.substring(pos - 50, pos + 250));
    pos += target.length;
  }
});

// If not found, let's find the first declaration of cw inside the kt_player function body.
// kt_player starts at 102882. Let's look for "cw" variable declaration or function definition in the next 10000 chars.
const start = content.indexOf('function kt_player(');
if (start !== -1) {
  const sub = content.substring(start, start + 10000);
  let idx = 0;
  while ((idx = sub.indexOf('cw', idx)) !== -1) {
    console.log(`cw inside kt_player at sub-index ${idx}:`);
    console.log(sub.substring(idx - 50, idx + 150));
    idx += 2;
  }
}
