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

const size = 8;
const weight = 2;
const speed = 0.75;

const playerSize = 28;
const playerMargin = 9;
const innerMargin = playerMargin-3;
const playerSpeed = 4;

const gs = {
  satellites: [],
  stars: [],
  playerPos: [[100,500],[600,500]],
  heldKeys: new Set()
}

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

  $(document).keyup(function(e) {
    gs.heldKeys.delete(e.which);
  });

  $(document).keydown(function(e) {
    gs.heldKeys.add(e.which);
  });
});



function randInt(max) {
  return Math.floor(Math.random()*max);
}

function setupStars() {
  gs.stars = [];
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
    gs.stars.push(newStar);
  }
}

function setupSatellites() {
  gs.satellites = [];
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
    gs.satellites.push(newSatellite);
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
  gs.satellites.push(newSatellite);
}

function distFromCenter(x,y) {
  return Math.sqrt(Math.pow(x-cWidth/2,2)+Math.pow(y-cHeight/2,2))
}

function update() {
  gs.satellites = gs.satellites.filter(s=>{
    let dist = distFromCenter(s.x,s.y);
    if (dist < 140) {
      let coeff = Math.pow((140-dist)/80,2)/500;
      s.dy += (s.y-cHeight/2)*coeff;
      s.dx += (s.x-cWidth/2)*coeff;
    }

    s.dx+=(Math.random()-.5)*.05;
    s.dy+=(Math.random()-.5)*.05;

    s.x+=s.dx;
    s.y+=s.dy;
    if (s.x-size < cWidth && s.x+size > 0
        && s.y-size < cHeight && s.y+size > 0) return s;
  });

  for (let i = 0; i < 50-gs.satellites.length; i++) {
    addSatellite();
  }

  if (gs.heldKeys.size > 0) {
    gs.heldKeys.forEach(k => {
      switch(k) {
        case 37: // left
          gs.playerPos[1][0] -= playerSpeed;
          break;
        case 38: // up
          gs.playerPos[1][1] -= playerSpeed;
          break;
        case 39: // right
          gs.playerPos[1][0] += playerSpeed;
          break;
        case 40: // down
          gs.playerPos[1][1] += playerSpeed;
          break;
        case 65: // A
          gs.playerPos[0][0] -= playerSpeed;
          break;
        case 87: // W
          gs.playerPos[0][1] -= playerSpeed;
          break;
        case 68: // D
          gs.playerPos[0][0] += playerSpeed;
          break;
        case 83: // S
          gs.playerPos[0][1] += playerSpeed;
          break;
        default:
          break;
      }
    });
  }
}

function draw() {
  ctx.clearRect(0,0,cWidth,cHeight);
  ctx.drawImage($('#earth')[0], cWidth/2-80, cHeight/2-80, 160, 160);

  gs.satellites.map(s=>{
    drawPolygon(ctx, s.x, s.y, s.type.sides, size,
                {color:s.type.color, weight:weight});
  });


  gs.stars.map(s=>{
    let bri = Math.floor(Math.sin((Date.now()-startTime)/300
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });

  drawPlayers();
}

function drawPlayers() {
  for (let i = 0; i<2; i++) {
    drawPlayer(gs.playerPos[i][0], gs.playerPos[i][1],i);
  }
}

function drawPlayer(x, y, player) {
  ctx.fillStyle = player ? 'black' : 'white';

  const topLeft = [x-playerSize/2, y-playerSize/2+playerMargin];
  const topRight = [x+playerSize/2, y-playerSize/2+playerMargin];
  const bottomLeft = [x-playerSize/2, y+playerSize/2-playerMargin];
  const bottomRight = [x+playerSize/2, y+playerSize/2-playerMargin];
  const leftTop = [x-playerSize/2+playerMargin, y-playerSize/2];
  const rightTop = [x+playerSize/2-playerMargin, y-playerSize/2];
  const leftBottom = [x-playerSize/2+playerMargin, y+playerSize/2];
  const rightBottom = [x+playerSize/2-playerMargin, y+playerSize/2];

  const innerTop = [x, y-innerMargin];
  const innerLeft = [x-innerMargin, y];
  const innerRight = [x+innerMargin, y];
  const innerBottom = [x, y+innerMargin];

  ctx.beginPath();
  ctx.moveTo(...topLeft);
  ctx.lineTo(...bottomLeft);
  ctx.lineTo(...innerLeft);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(...leftTop);
  ctx.lineTo(...rightTop);
  ctx.lineTo(...innerTop);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(...topRight);
  ctx.lineTo(...bottomRight);
  ctx.lineTo(...innerRight);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(...leftBottom);
  ctx.lineTo(...rightBottom);
  ctx.lineTo(...innerBottom);
  ctx.fill();
}
