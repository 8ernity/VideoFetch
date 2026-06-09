const f=["","is","ad","%","fp","video","url","pre","click","kt","type","pause","adv","player","error","left","true","width","px","post","height","src","position","top","/","absolute","start","vast","div","time","volume","function","kvs","duration","block","html","logo","=","tracking","get","margin","skip","speed","id","?","timeline",".","text","open","bottom","related","event","href","display",":","metadata","wrapper","paused","roll","rnd","iframe","&","play","touch","fullscreen","popunder","data","blank","subtitles","hidden","mouse","reporting","name","api","visible","preview","screen","advertising","load"," ","settings","playing","ui","hide","embed","false","progress","class","@","attributes","title","hls","vol","target","parent","right","adzone","<",">","loaded","format","pt","flv","controlbar","content","auto","float","key","preload","started","full","[","]","*","none","referer","mp4","exit","document","mute","resume","change","screens","down","muted","match","selected","flash","elapsed","btn","window","visibility","css","move","m","after","engine","stream","flowplayer","finished","undefined","code","-","_","on","#","preserve","slot","alt","redirect","4k","hd","a","list","lang","over","linear","parameters","quartile","padding","timeout","img","catch","no","body","transition","string","ads","fade","splash","controls","stop","waiting","protect","before","show","value","fill","default","script","item","media","overflow","z","index","end","creative","complete","remaining","unmute","style","head","cursor","pointer","resize","brand","clip","autoplay","empty","poster","ready","seek","up","disable","link","subtitle","sec","em","skin","stopped","changed","rate","test","categories","tags","models","mpegurl","1.0","speeds","loading","kind","en","background","playsinline","out","inline","impression","offset","first","third","file","skippable","state","frame","border","scrolling","focus","scroll","normal","replay","cuepoint","tooltip","relative","swf","native","loop","cuepoints","finish","landscape","seeking","level","vertical","dragging","ga","gtag","location","scrolled","changing","activated","deactivated","adblock","detected","object","array","storage","debug","domain","visit","application","vnd","apple","min","js","0.5","0.75","1.25","1.5","1.75","2.0","x","transparent","webkit","adaptive","ucbrowser","windows","mobile","through","view","mid","point","work","container","cover","Error","fatal","abort","not","supported","skipped","size","midpoint","thru","subscribe","handshake","version","set","init","can","anchor","urls","in","same","context","menu","textarea","ratio","license","only","thumbnails","webp","interval","count","basic","image","blur","help","fetchPriority","high","avif","fixed","slider","cc","unload","close","flow","stats","php","Init","send","category","label","pop","configuration","http","white","dark","rel","stylesheet"];

function ch(a){return f[a-4]}
function cg(a){return f[a-3]}
function cf(a){return f[a-2]}
function ce(a){return f[a-1]}
function cd(a){return f[a+4]}
function cc(a){return f[a+3]}
function cb(a){return f[a+2]}
function ca(a){return f[a+1]}

// Helper functions evaluated from kt_player_code.js
function cz(){var a=Array.prototype.slice.call(arguments);return a.join(ca(142))}
function cy(){var a=Array.prototype.slice.call(arguments);return a.join(cf(144))}
function cx(){var a=Array.prototype.slice.call(arguments);return a.join(ch(83))}
function cw(){var a=Array.prototype.slice.call(arguments);return a.join(cf(2))}

// The decryption functions
const a_sub = function(a,b){return a&&b?a.substring(b):a};

const b_dec = function(a,b,c,d,e){
  for(var f in a) {
    if(0==a[f].indexOf(b)){
      var g=a[f].substring(b.length).split(b[b.length-1]);
      if(g[0]>0){
        var h=g[6].substring(0,2*parseInt(d)),
            i=e?e(a,c,d):"";
        if(i&&h){
          for(var j=h,k=h.length-1;k>=0;k--){
            for(var l=k,m=k;m<i.length;m++)l+=parseInt(i[m]);
            for(;l>=h.length;)l-=h.length;
            for(var n="",o=0;o<h.length;o++)n+=o==k?h[l]:o==l?h[k]:h[o];
            h=n
          }
          g[6]=g[6].replace(j,h),
          g.splice(0,1),
          a[f]=g.join(b[b.length-1])
        }
      }
    }
  }
};

const c_dec = function(a,b,c){
  var e,g,h,i,j,k,l,m,n,d="",f="",o=parseInt;
  for(e in a)
    if(e.indexOf(b)>0&&a[e].length==o(c)){
      d=a[e];
      break
    }
  if(d){
    for(f="",g=1;g<d.length;g++)f+=o(d[g])?o(d[g]):1;
    for(j=o(f.length/2),k=o(f.substring(0,j+1)),l=o(f.substring(j)),g=l-k,g<0&&(g=-g),f=g,g=k-l,g<0&&(g=-g),f+=g,f*=2,f=""+f,i=o(c)/2+2,m="",g=0;g<j+1;g++)
      for(h=1;h<=4;h++)
        n=o(d[g+h])+o(f[g]),
        n>=i&&(n-=i),
        m+=n;
    return m
  }
  return d;
};

// Target config object from pimpbunny page (we update rnd to match output, but let's see what happens)
const config = {
  video_id: '551152',
  video_title: 'Waifu Cristal Pleases Her Creamy Pussy',
  video_categories: 'Masturbation',
  video_tags: 'Masturbation, Solo, Pussy, Pussy Play, Pussy Rubbing, Fingering, Orgasm, Creamy, Blonde',
  video_models: 'Waifu Cristal',
  license_code: '$576262819011919',
  lrc: '77028724',
  event_reporting: 'https://pimpbunny.com/player/stats.php?embed=0&device_type=1',
  event_reporting2: 'https://pimpbunny.com/get_file/1/44534470b147bfa3df449c21982875b067da262b72/551000/551152/551152.mp4/',
  reporting: 'true',
  play_reporting: 'https://pimpbunny.com/player/stats.php?event=FirstPlay&video_id=551152&device_type=1',
  rnd: '1781025507',
  video_url: 'function/0/https://pimpbunny.com/get_file/37/d88af9ccf1805c3c2cb2c1788affc40a465322bee6/551000/551152/551152_360p.mp4/',
  postfix: '_360p.mp4',
  video_url_text: '360p',
  video_alt_url: 'function/0/https://pimpbunny.com/get_file/37/b51a38ee1acd3d09a332256b8de7cf99bb5e53a8c5/551000/551152/551152.mp4/',
  video_alt_url_text: '480p',
  video_alt_url2: 'function/0/https://pimpbunny.com/get_file/37/2c68e5134eeded58bebe80fb524b9911cfabd05b86/551000/551152/551152_720p.mp4/',
  video_alt_url2_text: '720p',
  video_alt_url2_hd: '1',
  default_slot: '3',
  video_alt_url3: 'function/0/https://pimpbunny.com/get_file/37/77825f4cdfd78b67770f2726eef106005a5aee5058/551000/551152/551152_1080p.mp4/',
  video_alt_url3_text: '1080p',
  video_alt_url3_hd: '1'
};

console.log('--- Config BEFORE decryption ---');
console.log(config);

// Run the decryption (mimicking what player does in m.conf)
b_dec(config, "function/", "code", "16px", c_dec);

console.log('\n--- Config AFTER decryption ---');
console.log(config);
