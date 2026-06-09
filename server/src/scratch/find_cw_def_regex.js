import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

const regexes = [
  /\bvar\b[^;]*\bcw\b/g,
  /\bconst\b[^;]*\bcw\b/g,
  /\blet\b[^;]*\bcw\b/g,
  /\bcw\s*=\s*/g,
  /\bfunction\s+cw\b/g
];

regexes.forEach((r, idx) => {
  console.log(`--- Regex ${idx}: ${r} ---`);
  let match;
  while ((match = r.exec(content)) !== null) {
    console.log(`Match at index ${match.index}:`);
    console.log(content.substring(match.index - 50, match.index + 150));
  }
});
