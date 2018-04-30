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

const size = 8;
const weight = 2;
const speed = 0.75;

$(document).ready(function(){
  let $game = $('#game');
  ctx = $game[0].getContext('2d');
  cWidth = $game.attr('width');
  cHeight = $game.attr('height');

  setupSatellites();

  interval = setInterval(()=>{
    update();
    draw();
  }, 15);
});

function randInt(max) {
  return Math.floor(Math.random()*max);
}

function setupSatellites() {
  satellites.length = 0;
  for (let i = 0; i < 50; i++) {
    const newSatellite = {};
    newSatellite.type = satelliteTypes[randInt(5)];
    newSatellite.x = randInt(cWidth);
    newSatellite.y = randInt(cHeight);
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

function update() {
  satellites = satellites.filter(s=>{
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
  satellites.map(s=>{
    drawPolygon(ctx, s.x, s.y, s.type.sides, size,
                {color:s.type.color, weight:weight});
  });
}
