
const paramify = (params) => "?"+Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

// https://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function getQueryVariable(query, variable) {
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log('Query variable %s not found', variable);
}


// cost serverUrl = "http://192.168.43.62:3003"; // hotspot
// const serverUrl = "http://10.1.1.193:3003"; // home
const serverUrl = "https://sheltered-caverns-34537.herokuapp.com"; // heroku



// takes a title and tries to parse the name of the song (or a search term)
// returns a list of ranked possibilities
const parseName = title=>{
  // first makes it safe
  // remove things in brackets
  // remove things from blacklist (e.g. music video, feat)
  // remove anything after 'ft.' 'feat' 'prod

  // remove brackets [] and () and their content
  let newTitle = title.replace(/\([^\)]*\)/g, '');
  newTitle = newTitle.replace(/\[[^\]]*\]/g, '');

  // making it safe
  newTitle = sanitizeString(newTitle);
  // remove duplicate spaces
  newTitle = newTitle.replace( /\s\s+/g, ' ' );
  
  const blacklist = [
    "official music video",
    "music video",
    "official mv",
    "video",
    "official video",
    "official visualizer",
    "visualizer",
    "audio",
    "official audio",
  ];
  const removeAfter = ["ft.", " feat", "prod"];

  newTitle = newTitle.toLowerCase();

  for(let i=0; i<blacklist.length;i++){
    newTitle = newTitle.replace(blacklist[i], "");
  }
  // remove anything after ft or feat (feat gets featuring too)
  for(let i=0; i<removeAfter.length;i++){
    newTitle = newTitle.split(removeAfter[i])[0];
  }
  newTitle = newTitle.trim()


  let song = newTitle.split("-")
  song = song[song.length-1].trim();

  // remove dashes at end so you can get song name
  newTitle = newTitle.replace(/[\-+]/g, '');
  // remove double space again
  newTitle = newTitle.replace( /\s\s+/g, ' ');
  
  return [newTitle, song]
}

// https://stackoverflow.com/questions/23187013/is-there-a-better-way-to-sanitize-input-with-javascript
function sanitizeString(str){
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
  return str.trim();
}

const scrollOptions = {
  damping: 0.1,
  thumbMinSize: 20,
  renderByPixels: !('ontouchstart' in document),
  alwaysShowTracks: false,
  continuousScrolling: true,
};

const overscrollOptions = {
  enable: true,
  effect: navigator.userAgent.match(/Android/) ? 'glow' : 'bounce',
  damping: 0.2,
  maxOverscroll: 150,
  glowColor: '#222a2d',
};

const c = document.createElement("canvas");
var ctx = c.getContext("2d");

var canvasLock = false;

// https://www.w3schools.com/tags/canvas_getimagedata.asp
async function getImageColour(imageUrl){
  return new Promise((resolve, reject)=>{
    let img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = ()=>{
      // waits until the canvas isnt being used
      // while(canvasLock == true){}
      canvasLock = true;
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0);
      let imgData = ctx.getImageData(0, 0, c.width, c.height);
      canvasLock = false;

      let avgR = 0
      let avgG = 0
      let avgB = 0
      let total = 0
      for (let i = 0; i < imgData.data.length; i += 4) {
        // weights colour by its transparency
        const alpha = imgData.data[i+3];
        total += alpha
        avgR += imgData.data[i] * alpha
        avgG += imgData.data[i + 1] * alpha
        avgB += imgData.data[i + 2] * alpha
      }
      resolve([avgR/total, avgG/total, avgB/total]);
    };
    img.onerror = reject
    img.src = imageUrl
    img.crossOrigin = "Anonymous";
  })
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export {
  sanitizeString,
  parseName,
  serverUrl,
  getQueryVariable,
  paramify,
  overscrollOptions,
  scrollOptions,
  getImageColour,
  shuffleArray
}