import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// Find all occurrences of the index of "function" (31) or f[31] or ce(32) etc.
// Let's search for "function" in quotes or retrieved via ce(32).
// In evaluating, we found:
// ce(32) => "function"
// And f[31] => "function"
// Let's search for any occurences of "ce(32)" or f[31] or f[32] in the file.
console.log('--- Occurrences of ce(32) ---');
let pos = 0;
while ((pos = content.indexOf('ce(32)', pos)) !== -1) {
  console.log(`Found ce(32) at ${pos}:`);
  console.log(content.substring(pos - 100, pos + 100));
  pos += 6;
}

console.log('--- Occurrences of cf(33) ---');
pos = 0;
while ((pos = content.indexOf('cf(33)', pos)) !== -1) {
  console.log(`Found cf(33) at ${pos}:`);
  console.log(content.substring(pos - 100, pos + 100));
  pos += 6;
}

console.log('--- Occurrences of cg(34) ---');
pos = 0;
while ((pos = content.indexOf('cg(34)', pos)) !== -1) {
  console.log(`Found cg(34) at ${pos}:`);
  console.log(content.substring(pos - 100, pos + 100));
  pos += 6;
}

console.log('--- Occurrences of ch(35) ---');
pos = 0;
while ((pos = content.indexOf('ch(35)', pos)) !== -1) {
  console.log(`Found ch(35) at ${pos}:`);
  console.log(content.substring(pos - 100, pos + 100));
  pos += 6;
}
