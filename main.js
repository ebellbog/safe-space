const satelliteTypes = [
  {color: 'red',
   sides: 3},
  {color: 'yellow',
   sides: 4},
  {color: 'limegreen',
   sides: 5},
  {color: 'cyan',
   sides: 6},
  {color: 'blueviolet',
   sides: 20},
]

let satellites = [];
const stars = [];

const size = 8;
const weight = 2;
const speed = 0.75;

$(document).ready(function(){
  let $game = $('#game');
  ctx = $game[0].getContext('2d');
  cWidth = $game.attr('width');
  cHeight = $game.attr('height');
  startTime = Date.now();

  setupSatellites();
  setupStars();

  interval = setInterval(()=>{
    update();
    draw();
  }, 15);
});

function randInt(max) {
  return Math.floor(Math.random()*max);
}

function setupStars() {
  stars.length = 0;
  for (let i = 0; i < 100; i++) {
    const newStar = {};
    newStar.size = randInt(2)+1;
    newStar.twinkle = Math.random();

    let dist = 0;
    while (dist < 120) {
      newStar.x = randInt(cWidth);
      newStar.y = randInt(cHeight);
      dist = distFromCenter(newStar.x, newStar.y);
    }
    stars.push(newStar);
  }
}

function setupSatellites() {
  satellites.length = 0;
  for (let i = 0; i < 50; i++) {
    const newSatellite = {};
    newSatellite.type = satelliteTypes[randInt(5)];

    let dist = 0;
    while (dist < 100) {
      newSatellite.x = randInt(cWidth);
      newSatellite.y = randInt(cHeight);
      dist = distFromCenter(newSatellite.x, newSatellite.y);
    }

    newSatellite.dx = speed;
    newSatellite.dy = speed;
    satellites.push(newSatellite);
  }
}

function addSatellite() {
  const newSatellite = {};
  newSatellite.type = satelliteTypes[randInt(5)];
  if (Math.random()>0.5) {
    newSatellite.x = -size;
    newSatellite.y = randInt(cHeight);
  } else {
    newSatellite.y = -size;
    newSatellite.x = randInt(cWidth);
  }
  newSatellite.dx = speed;
  newSatellite.dy = speed;
  satellites.push(newSatellite);
}

function distFromCenter(x,y) {
  return Math.sqrt(Math.pow(x-cWidth/2,2)+Math.pow(y-cHeight/2,2))
}

function update() {
  satellites = satellites.filter(s=>{
    if (distFromCenter(s.x,s.y) < 100) {
      s.dy *= 0.9;
      s.dx *= 0.9;
    }

    s.dx+=(Math.random()-.5)*.05;
    s.dy+=(Math.random()-.5)*.05;

    s.x+=s.dx;
    s.y+=s.dy;
    if (s.x-size < cWidth && s.y-size <cHeight) return s;
  });

  for (let i = 0; i < 50-satellites.length; i++) {
    addSatellite();
  }
}

function draw() {
  ctx.clearRect(0,0,cWidth,cHeight);
  ctx.drawImage($('#earth')[0], cWidth/2-80, cHeight/2-80, 160, 160);

  satellites.map(s=>{
    drawPolygon(ctx, s.x, s.y, s.type.sides, size,
                {color:s.type.color, weight:weight});
  });


  stars.map(s=>{
    let bri = Math.floor(Math.sin((Date.now()-startTime)/300
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });
}
