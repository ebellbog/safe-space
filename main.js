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

const satelliteSize = 9;
const weight = 2;
const speed = 0.75;

const playerSize = 30;
const playerMargin = 11;
const innerMargin = playerMargin-4;
const playerSpeed = 4;

const gs = {
  satellites: {},
  highlighted: [-1,-1],
  selected: [-1,-1],
  stars: [],
  playerPos: [[100,500],[600,500]],
  heldKeys: new Set(),
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
    switch(e.which) {
      case 67: // c
        if (gs.highlighted[0]) {
         gs.selected[0] = gs.highlighted[0];
        };
        break;
      case 86: // v
        gs.selected[0] = -1;
        break;
      case 78: // n
        if (gs.highlighted[1]) {
         gs.selected[1] = gs.highlighted[1];
        };
        break;
      case 77: // m
        gs.selected[1] = -1;
        break;
      case 32: // space
        break;
      default:
        gs.heldKeys.add(e.which);
        break;
    }
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
  gs.satellites = {};
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
    gs.satellites[generateId()] = newSatellite;
  }
}

function addSatellite() {
  const newSatellite = {};
  newSatellite.type = satelliteTypes[randInt(5)];
  if (Math.random()>0.5) {
    newSatellite.x = -satelliteSize;
    newSatellite.y = randInt(cHeight);
  } else {
    newSatellite.y = -satelliteSize;
    newSatellite.x = randInt(cWidth);
  }
  newSatellite.dx = speed;
  newSatellite.dy = speed;
  gs.satellites[generateId()] = newSatellite;
}

function generateId() {
  return Math.floor(Math.random()*100000);
}

function getDist(p1, p2) {
  return Math.sqrt(Math.pow(p1[0]-p2[0],2)+Math.pow(p1[1]-p2[1],2));
}

function distFromCenter(x,y) {
  return getDist([x,y], [cWidth/2,cHeight/2]);
}

function isInBounds(x,y) {
  return (x-satelliteSize < cWidth && x+satelliteSize > 0
        && y-satelliteSize < cHeight && y+satelliteSize > 0);
}

function isSelected(k) {
  return (gs.selected[0] == k || gs.selected[1] == k);
}

function isHighlighted(k) {
  return (gs.highlighted[0] == k || gs.highlighted[1] == k);
}

function update() {
  Object.keys(gs.satellites).map(k=>{
    if (isSelected(k)) return;
    const s = gs.satellites[k];

    const dist = distFromCenter(s.x,s.y);
    if (dist < 140) {
      const coeff = Math.pow((140-dist)/80,2)/500;
      s.dy += (s.y-cHeight/2)*coeff;
      s.dx += (s.x-cWidth/2)*coeff;
    }

    s.dx+=(Math.random()-.5)*.05;
    s.dy+=(Math.random()-.5)*.05;

    s.x+=s.dx;
    s.y+=s.dy;
    if (!isInBounds(s.x,s.y)) delete(gs.satellites[k]);
  });

  for (let i = 0; i < 50-Object.keys(gs.satellites).length; i++) {
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

  const newHighlighted = [-1,-1];
  const minDist = [17,17];
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];

    if (isSelected(k)) {
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+2,
                  {color:s.type.color, weight:weight, style:'fill'});
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+3,
                  {color:'white', weight:3, style:'stroke'});

    } else {
      let highlight = false;
      for (let i = 0; i < 2; i++) {
        const dist = getDist([s.x,s.y], gs.playerPos[i]);
        if (dist < minDist[i]) {
          newHighlighted[i] = parseInt(k);
          minDist[i] = dist;
          highlight = true;
        }
      }

      const style =  isSelected(k) || highlight ? 'fill' : 'stroke';
      const expand = isSelected(k) || highlight ? 3 : 0;

      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+expand,
                  {color:s.type.color, weight:weight, style:style});
    }

  });
  gs.highlighted = newHighlighted;

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
