import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'server', 'src', 'scratch', 'kt_player_code.js');
const content = fs.readFileSync(file, 'utf8');

// The f array
const f = ["","is","ad","%","fp","video","url","pre","click","kt","type","pause","adv","player","error","left","true","width","px","post","height","src","position","top","/","absolute","start","vast","div","time","volume","function","kvs","duration","block","html","logo","=","tracking","get","margin","skip","speed","id","?","timeline",".","text","open","bottom","related","event","href","display",":","metadata","wrapper","paused","roll","rnd","iframe","&","play","touch","fullscreen","popunder","data","blank","subtitles","hidden","mouse","reporting","name","api","visible","preview","screen","advertising","load"," ","settings","playing","ui","hide","embed","false","progress","class","@","attributes","title","hls","vol","target","parent","right","adzone","<",">","loaded","format","pt","flv","controlbar","content","auto","float","key","preload","started","full","[","]","*","none","referer","mp4","exit","document","mute","resume","change","screens","down","muted","match","selected","flash","elapsed","btn","window","visibility","css","move","m","after","engine","stream","flowplayer","finished","undefined","code","-","_","on","#","preserve","slot","alt","redirect","4k","hd","a","list","lang","over","linear","parameters","quartile","padding","timeout","img","catch","no","body","transition","string","ads","fade","splash","controls","stop","waiting","protect","before","show","value","fill","default","script","item","media","overflow","z","index","end","creative","complete","remaining","unmute","style","head","cursor","pointer","resize","brand","clip","autoplay","empty","poster","ready","seek","up","disable","link","subtitle","sec","em","skin","stopped","changed","rate","test","categories","tags","models","mpegurl","1.0","speeds","loading","kind","en","background","playsinline","out","inline","impression","offset","first","third","file","skippable","state","frame","border","scrolling","focus","scroll","normal","replay","cuepoint","tooltip","relative","swf","native","loop","cuepoints","finish","landscape","seeking","level","vertical","dragging","ga","gtag","location","scrolled","changing","activated","deactivated","adblock","detected","object","array","storage","debug","domain","visit","application","vnd","apple","min","js","0.5","0.75","1.25","1.5","1.75","2.0","x","transparent","webkit","adaptive","ucbrowser","windows","mobile","through","view","mid","point","work","container","cover","Error","fatal","abort","not","supported","skipped","size","midpoint","thru","subscribe","handshake","version","set","init","can","anchor","urls","in","same","context","menu","textarea","ratio","license","only","thumbnails","webp","interval","count","basic","image","blur","help","fetchPriority","high","avif","fixed","slider","cc","unload","close","flow","stats","php","Init","send","category","label","pop","configuration","http","white","dark","rel","stylesheet"];

// Helper functions
function ch(a){return f[a-4]}
function cg(a){return f[a-3]}
function cf(a){return f[a-2]}
function ce(a){return f[a-1]}
function cd(a){return f[a+4]}
function cc(a){return f[a+3]}
function cb(a){return f[a+2]}
function ca(a){return f[a+1]}

// Let's find all occurrences of "indexOf" or "replace" that might touch a string having the word "function"
// Let's search for "indexOf" or "replace" in kt_player_code.js
console.log('--- Searching for string decoding functions ---');
// Let's write a function to search for functions in the JS file.
// Let's search for the decryption function names, or functions that process 'd' or 'B[0]'.
// Let's find where 'B' is used in kt_player_code.js
let pos = 0;
while ((pos = content.indexOf('B[0]', pos)) !== -1) {
  console.log(`Found B[0] at index ${pos}:`);
  console.log(content.substring(pos - 150, pos + 250));
  pos += 4;
}

console.log('\n--- Searching for functions that take url or string ---');
// Let's search for "function/" or similar by looking at combinations that could mean f[31] + "/"
// f[31] is "function". f[24] is "/".
// E.g., ce(32) + cc(21) or similar?
// Let's print out what some combinations of the helpers evaluate to:
console.log('f[31] via ce(32):', ce(32));
console.log('f[24] via cd(20):', cd(20));
console.log('f[24] via cc(21):', cc(21));
console.log('f[24] via cb(22):', cb(22));
console.log('f[24] via ca(23):', ca(23));

// Let's look for how urls are resolved or decoded!
// KVS has a decryption function. Let's find it.
