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
  connected: new Set(),
  connections: {},
  validConnection: [false, false],
  stars: [],
  playerPos: [[100,500],[600,500]],
  playerVector: [[0,0], [0,0]],
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
        selectWithPlayer(0);
        break;
      case 86: // v
        gs.selected[0] = -1;
        break;
      case 78: // n
        selectWithPlayer(1);
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

function createConnection(id1,id2) {
  const s1 = gs.satellites[id1];
  const s2 = gs.satellites[id2];
  if (crossesEarth([s1.x,s1.y], [s2.x,s2.y])) return;

  const newConnection = {};
  newConnection.p1 = [s1.x,s1.y];
  newConnection.p2 = [s2.x,s2.y];
  newConnection.color = s1.type.color;

  gs.connections[generateId()] = newConnection;
  gs.connected.add(id1).add(id2);
  for (let i = 0; i < 2; i++) {
    if (gs.selected[i] == id1 || gs.selected[i] == id2) gs.selected[i] = -1;
  }
}

function selectWithPlayer(player) {
  if (gs.highlighted[player] > -1) {
    const pType = getPlayerType(player);
    if (pType) {
      const hType = gs.satellites[gs.highlighted[player]].type;
      if (hType != pType) return;
      else {
        createConnection(gs.highlighted[player],
                         gs.selected[otherPlayer(player)]);
      }
    } else {
      gs.selected[player] = gs.highlighted[player];
    }
  };
}

function generateId() {
  return Math.floor(Math.random()*1000000);
}

function getDist(p1, p2) {
  return Math.sqrt(Math.pow(p1[0]-p2[0],2)+Math.pow(p1[1]-p2[1],2));
}

function distFromCenter(x,y) {
  return getDist([x,y], [cWidth/2,cHeight/2]);
}

function isInBounds(x, y, size) {
  return (x-size < cWidth && x+size > 0
        && y-size < cHeight && y+size > 0);
}

function crossesEarth(p1,p2) {
  const eX = cWidth/2;
  const eY = cHeight/2;
  const pE = [eX,eY];
  const eR = 80;

  const m1 = (p2[1]-p1[1])/(p2[0]-p1[0]);
  const b1 = (p1[1]-p1[0]*m1);

  const m2 = -1/m1;
  const b2 = (eY-eX*m2);

  //m1*x+b1 = m2*x+b2;
  const cX = (b2-b1)/(m1-m2);
  const cY = m1*cX+b1;
  let p3 = [cX,cY];

  if (getDist(p1,p3) > getDist(p1,p2)) p3 = p2;
  else if (getDist(p2,p3) > getDist(p1,p2)) p3 = p1;

  return getDist(p3,pE) < eR;
}

function isSelected(k) {
  return (gs.selected[0] == k || gs.selected[1] == k);
}

function isHighlighted(k) {
  return (gs.highlighted[0] == k || gs.highlighted[1] == k);
}

function isConnected(k) {
  return gs.connected.has(parseInt(k));
}

function getPlayerType(player) {
  let pType = false;
  if (gs.selected[otherPlayer(player)] > -1) {
    pType = gs.satellites[gs.selected[otherPlayer(player)]].type;
  }
  return pType;
}

function otherPlayer(player) {
  return (player+1)%2;
}

function update() {
  Object.keys(gs.satellites).map(k=>{
    if (isSelected(k) || isConnected(k)) return;
    const s = gs.satellites[k];

    const dist = distFromCenter(s.x,s.y);
    if (dist < 140) {
      const coeff = Math.pow((140-dist)/90,2)/400;
      s.dy += (s.y-cHeight/2)*coeff;
      s.dx += (s.x-cWidth/2)*coeff;
    }

    s.dx+=(Math.random()-.5)*.05;
    s.dy+=(Math.random()-.5)*.05;

    s.x+=s.dx;
    s.y+=s.dy;
    if (!isInBounds(s.x,s.y,satelliteSize)) delete(gs.satellites[k]);
  });

  for (let i = 0; i < 50-Object.keys(gs.satellites).length; i++) {
    addSatellite();
  }

  const acc = .25;
  const max = 5.5;
  let doAcc = [false, false];

  if (gs.heldKeys.size > 0) {
    gs.heldKeys.forEach(k => {
      switch(k) {
        case 37: // left
          gs.playerVector[1][0] -= acc;
          doAcc[1] = true;
          break;
        case 38: // up
          gs.playerVector[1][1] -= acc;
          doAcc[1] = true;
          break;
        case 39: // right
          gs.playerVector[1][0] += acc;
          doAcc[1] = true;
          break;
        case 40: // down
          gs.playerVector[1][1] += acc;
          doAcc[1] = true;
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

    for (let i = 0; i < 2; i++) {
      const mag = Math.sqrt(Math.pow(gs.playerVector[i][0],2)+
                            Math.pow(gs.playerVector[i][1],2));
      const scale = max/mag;
      if (scale < 1) {
        gs.playerVector[i][0] *= scale;
        gs.playerVector[i][1] *= scale;
      }
    }
  }

  for (let i = 0; i < 2; i++) {
    if (!doAcc[i]) {
      gs.playerVector[i][0] *= .85;
      gs.playerVector[i][1] *= .85;
    }

    const newX = gs.playerPos[i][0]+gs.playerVector[i][0];
    const newY = gs.playerPos[i][1]+gs.playerVector[i][1];

    if (!isInBounds(newX, newY, 0)) {
      gs.playerVector[i] = [0,0];
      continue;
    }
    gs.playerPos[i] = [newX, newY];
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0,0,cWidth,cHeight);
  ctx.drawImage($('#earth')[0], cWidth/2-80, cHeight/2-80, 160, 160);

  gs.stars.map(s=>{
    let bri = Math.floor(Math.sin((Date.now()-startTime)/300
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });

  const newHighlighted = [-1,-1];
  const minDist = [17,17];
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];

    if (isSelected(k)) {
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+2,
                  {color:s.type.color, style:'fill'});
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+3,
                  {color:'white', weight:3, style:'stroke'});

    } else if (isConnected(k)){
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+2,
                  {color:s.type.color, style:'fill'});
    } else {
      let highlight = false;
      for (let i = 0; i < 2; i++) {
        const pType = getPlayerType(i);
        if (pType && pType != s.type) continue;
        if (pType && !gs.validConnection[i]) continue;

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

  drawConnections();
  drawPlayers();
  ctx.restore();
}

function drawConnections() {
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < 2; i++) {
    if (gs.selected[i] > -1) {
      const s = gs.satellites[gs.selected[i]];

      ctx.strokeStyle = s.type.color;

      const valid = !crossesEarth([s.x,s.y],gs.playerPos[otherPlayer(i)]);
      gs.validConnection[otherPlayer(i)] = valid;

      const width = 2000/getDist([s.x,s.y], gs.playerPos[otherPlayer(i)]);

      if (valid) {
        ctx.lineWidth = Math.min(Math.max(width, .5), 10);
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.5;
      }
      else {
        ctx.lineWidth = Math.min(Math.max(width, 4), 6);
        ctx.setLineDash([1,10]);
        ctx.globalAlpha = 0.8;
      }

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(...gs.playerPos[otherPlayer(i)]);
      ctx.stroke();
    }
  }

  ctx.restore();

  ctx.lineWidth = 5; //TODO: width based on distance?
  Object.keys(gs.connections).map(k=>{
    const cnctn = gs.connections[k];
    ctx.strokeStyle = cnctn.color;
    ctx.beginPath();
    ctx.moveTo(...cnctn.p1);
    ctx.lineTo(...cnctn.p2);
    ctx.stroke();
  });
}

function drawPlayers() {
  for (let i = 0; i<2; i++) {
    drawPlayer(gs.playerPos[i][0], gs.playerPos[i][1],i);
  }
}

function drawPlayer(x, y, player, color) {
  ctx.save();
  const s = gs.selected[otherPlayer(player)];
  if (color) {
    ctx.fillStyle=color;
  }
  else if (s == -1) {
    ctx.fillStyle = player ? 'black' : 'white';
    ctx.shadowColor = player ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)';
  } else {
    ctx.fillStyle =  gs.satellites[s].type.color;
    ctx.shadowColor = 'black';
  }
  ctx.shadowBlur = 8;

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

  ctx.restore();
}
