// Data models & config

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

const satelliteDensity = 6; // inversely proportional
const satelliteSize = 8;
const weight = 1.75;
const rspeed = .5;

const playerSize = 30;
const playerMargin = 11;
const innerMargin = playerMargin-4;

const meteorSize = 14;
const maxMeteors = 6;

const earthRadius = 60;

const starCount = 120;

let titleInterval, gameInterval;

// Setup functions

$(document).ready(function(){
  let $game = $('#game');
  ctx = $game[0].getContext('2d');
  cWidth = parseInt($game.attr('width'));
  cHeight = parseInt($game.attr('height'));

  alignElements();
  $(window).resize(alignElements);

  $(document).keyup(function(e) {
    switch(e.which) {
      case 67: // c
        gs.selected[0] = -1;
        break;
      case 78: // n
        gs.selected[1] = -1;
      default:
        gs.heldKeys.delete(e.which);
    }
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
      case 32:// space
        if (!(gs.selected[0] == -1 || gs.selected[1] ==  -1)) {
          createConnection(gs.selected[0], gs.selected[1]);
        }
        break;
      case 13: // return
        startGame();
        break;
      default:
        gs.heldKeys.add(e.which);
        break;
    }
  });

  startTitles();
});

function alignElements() {
  const $game = $('#game');
  $('#stats').css('left', $game.offset().left)
             .css('top', $game.offset().top);
}

function startGame() {
  if (titleInterval) clearInterval(titleInterval);
  if (gameInterval) clearInterval(gameInterval);

  $('#stats').show();
  $('.titleScreen').hide();

  gs = {
    satellites: {},
    highlighted: [-1,-1],
    selected: [-1,-1],
    connected: new Set(),
    connections: {},
    validConnection: [false, false],
    stars: [],
    meteors: {},
    playerVector: [[0,0], [0,0]],
    heldKeys: new Set(),
    startTime: Date.now(),
    lastAccelerateTime: Date.now(),
    lastMeteorTime: Date.now(),
    nextMeteor: 5000,
    meteorSpeed: .4,
    meteorFrequency: 6,
    meteorsStopped: 0,
    shakeEarth: 0,
    hits: 0
  }

  const playerMargin = 60;
  gs.playerPos = [[playerMargin, cHeight-playerMargin],
                  [cWidth-playerMargin, cHeight-playerMargin]];

  setupSatellites();
  setupStars();

  updateHealth();
  updateMeteorsStopped();

  gameInterval = setInterval(()=>{
    update();
    draw();
  }, 15);
}

function startTitles() {
  gs = {
    stars: [],
    startTime: Date.now(),
    heldKeys: new Set()
  }

  setupStars();
  titleInterval = setInterval(()=>{
    ctx.clearRect(0,0,cWidth,cHeight);
    drawStars();
    drawLogo();
  }, 15);
}

function setupStars() {
  gs.stars = [];
  for (let i = 0; i < starCount; i++) {
    const newStar = {};
    newStar.size = randInt(2)+1;
    newStar.twinkle = Math.random();

    let dist = 0;
    while (dist < earthRadius*1.75) {
      newStar.x = randInt(cWidth);
      newStar.y = randInt(cHeight);
      dist = distToCenter(newStar.x, newStar.y);
    }
    gs.stars.push(newStar);
  }
}

function setupSatellites() {
  const space = 10;
  const diagonalRadius = Math.sqrt(Math.pow(cWidth/2,2)+
                              Math.pow(cHeight/2,2));
  const squareRadius = Math.min(cWidth, cHeight)/2;
  const maxRadius = (squareRadius-earthRadius-space)*.93;
  const orbitSpace = satelliteSize*1.75;
  const indexRange = maxRadius/orbitSpace;

  gs.satellites = {}
  for (let i = 0; i < indexRange; i++) {
    const ringCount = Math.floor(orbitSpace*Math.sqrt(i)/satelliteDensity);
    for (let j = 0; j < ringCount; j++) {
      const newSatellite = {};
      newSatellite.type = satelliteTypes[randInt(5)];
      newSatellite.r = earthRadius + space + i*orbitSpace;
      newSatellite.theta = randInt(365)*Math.PI*2/365;
      newSatellite.dt = (rspeed+(Math.random()-.5)/2)/newSatellite.r;
      gs.satellites[generateId()] = newSatellite;
    }
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
  newConnection.id1 = id1;
  newConnection.p1 = [s1.x,s1.y];
  newConnection.id2 = id2;
  newConnection.p2 = [s2.x,s2.y];
  newConnection.color = s1.type.color;

  gs.connections[generateId()] = newConnection;
  gs.connected.add(id1).add(id2);
  for (let i = 0; i < 2; i++) {
    if (gs.selected[i] == id1 || gs.selected[i] == id2) gs.selected[i] = -1;
  }
}

function removeConnection(cId) {
  const c = gs.connections[cId];
  gs.connected.delete(c.id1);
  gs.connected.delete(c.id2);
  delete(gs.connections[cId]);
}

function addMeteor() {
  const newMeteor = {};
  newMeteor.points = generateMeteorPoints();
  newMeteor.type = satelliteTypes[randInt(5)];
  newMeteor.rotation = randFloat(2*Math.PI);
  newMeteor.offset = randInt(meteorSize);

  switch(randInt(4)) {
    case 0: // left side
      newMeteor.x = -meteorSize;
      newMeteor.y = randInt(cHeight);
      break;
    case 1: // top side
      newMeteor.x = randInt(cWidth);
      newMeteor.y = -meteorSize;
      break;
    case 2: // right side
      newMeteor.x = cWidth+meteorSize;
      newMeteor.y = randInt(cHeight);
      break;
    case 3: // bottom side
      newMeteor.x = randInt(cWidth);
      newMeteor.y = cHeight+meteorSize;
      break;
  }

  newMeteor.dt = randOffset(.03);
  newMeteor.dx = cWidth/2-newMeteor.x;
  newMeteor.dy = cHeight/2-newMeteor.y;

  const coeff = Math.sqrt(Math.pow(gs.meteorSpeed,2)/
                (Math.pow(newMeteor.dx,2)+
                 Math.pow(newMeteor.dy,2)));

  newMeteor.dx *= coeff;
  newMeteor.dy *= coeff;

  gs.meteors[generateId()] = newMeteor;
}

function generateMeteorPoints() {
  const count = 6+randInt(6);
  const points = [];

  let theta = 0, r;
  while (theta < Math.PI*2) {
    r = meteorSize+randOffset(4);
    theta += .1+randFloat(2*Math.PI/count-.1);
    theta = Math.min(theta, Math.PI*2);

    points.push([r, theta]);
  }

  return points;
}

function selectWithPlayer(player) {
  if (gs.selected[player] != -1) return;
  if (gs.highlighted[player] > -1) {
    const pType = getPlayerType(player);
    if (pType) {
      const hType = gs.satellites[gs.highlighted[player]].type;
      if (hType == pType) {
        gs.selected[player] = gs.highlighted[player];
        //createConnection(gs.highlighted[player],
        //                 gs.selected[otherPlayer(player)]);
      }
    } else {
      gs.selected[player] = gs.highlighted[player];
    }
  };
}

// Helper functions

function randInt(max) {
  return Math.floor(Math.random()*max);
}

function randFloat(max) {
  return Math.random()*max;
}

function randOffset(max) {
  return (Math.random()-.5)*2*max;
}

function generateId() {
  return Math.floor(Math.random()*1000000);
}

function getDist(p1, p2) {
  return Math.sqrt(Math.pow(p1[0]-p2[0],2)+Math.pow(p1[1]-p2[1],2));
}

function distToCenter(x,y) {
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

  return distToLine(p1,p2,pE) < earthRadius;
}

function distToLine(l1,l2,p) {
  const m1 = (l2[1]-l1[1])/(l2[0]-l1[0]);
  const b1 = (l1[1]-l1[0]*m1);

  const m2 = -1/m1;
  const b2 = (p[1]-p[0]*m2);

  const cX = (b2-b1)/(m1-m2);
  const cY = m1*cX+b1;
  let closest = [cX,cY];

  if (getDist(l1,closest) > getDist(l1,l2)) closest = l2;
  else if (getDist(l2,closest) > getDist(l1,l2)) closest = l1;

  return getDist(closest,p);
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

// Update functions

function updateSatellites() {
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];
    if (isSelected(k) || isConnected(k)) return;
    s.theta += s.dt;
  });
}

function updatePlayers() {
  const acc = .3;
  const dec = .85;
  const max = 6;
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
          gs.playerVector[0][0] -= acc;
          doAcc[0] = true;
          break;
        case 87: // W
          gs.playerVector[0][1] -= acc;
          doAcc[0] = true;
          break;
        case 68: // D
          gs.playerVector[0][0] += acc;
          doAcc[0] = true;
          break;
        case 83: // S
          gs.playerVector[0][1] += acc;
          doAcc[0] = true;
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
      gs.playerVector[i][0] *= dec;
      gs.playerVector[i][1] *= dec;
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

function updateMeteors() {
  // move existing meteors
  Object.keys(gs.meteors).map(k=>{
    const m = gs.meteors[k];
    m.x += m.dx;
    m.y += m.dy;
    m.rotation += m.dt;

    // test for collision with planet
    const dist = distToCenter(...getMeteorCenter(m));
    if (dist < earthRadius+meteorSize) {
      gs.shakeEarth = Date.now();
      delete(gs.meteors[k]);

      gs.hits += 1;
      updateHealth();

      if (gs.hits == 3) setTimeout(()=> {
        clearInterval(gameInterval);
        alert('Game over :(');
        startGame();
      }, 400);
    }

    // test for collision with line
    Object.keys(gs.connections).map(y=>{
      const c = gs.connections[y];
      if (c.color != m.type.color) return;

      const dist = distToLine(c.p1, c.p2, getMeteorCenter(m));
      if (dist < meteorSize) {
        removeConnection(y);
        delete(gs.meteors[k]);
        gs.meteorsStopped += 1;
        updateMeteorsStopped();
      }
    });
  });

  // add new meteor
  if (Date.now()-gs.lastMeteorTime > gs.nextMeteor
      && Object.keys(gs.meteors).length < maxMeteors) {
     addMeteor();
     gs.lastMeteorTime = Date.now();
     gs.nextMeteor = gs.meteorFrequency*1000+
                     randInt(gs.meteorFrequency*2000);
  }


  if ((Date.now()-gs.lastAccelerateTime)/1000 > 25) {
    gs.meteorSpeed = Math.min(gs.meteorSpeed+.1, 1.5);
    gs.meteorFrequency = Math.max(gs.meteorFrequency-.5, 2);
    gs.lastAccelerateTime = Date.now();
  }
}

function updateTimer() {
  const elapsed = (Date.now()-gs.startTime)/1000;
  const min = Math.floor(elapsed/60);
  const sec = Math.floor(elapsed%60);
  const zero = sec < 10 ? '0' : '';

  const timeString = `${min}:${zero}${sec}`;
  $('#timer').html(timeString);
}

function updateHealth() {
  $('#health').html('❤️'.repeat(3-gs.hits));
}

function updateMeteorsStopped() {
  $('#stopped').html(gs.meteorsStopped);
}

function update() {
  updateSatellites();
  updateMeteors();
  updatePlayers();
  updateTimer();
}

// Draw functions

function draw() {
  ctx.clearRect(0,0,cWidth,cHeight);

  drawStars();
  drawEarth();
  drawSatellites();
  drawConnections();
  drawMeteors();
  drawPlayers();
}

function drawEarth() {
  let dx = 0, dy = 0;
  if (gs.shakeEarth && Date.now()%3==0) {
    if (Date.now()-gs.shakeEarth > 300) gs.shakeEarth = 0;
    else {
      dx = randOffset(5);
      dy = randOffset(5);
    }
  }

  ctx.save();
  ctx.filter = `sepia(${gs.hits/3})`;
  ctx.drawImage($('#earth')[0], cWidth/2-earthRadius+dx,
                                cHeight/2-earthRadius+dy,
                                2*earthRadius,
                                2*earthRadius);
  ctx.restore();
}

function drawLogo() {
  const elapsed = (Date.now()-gs.startTime)/1000;
  const radius = 205+15*Math.sin(elapsed/1.5);
  const length = 385;
  const rotation = 3*Math.PI/10+elapsed/10;
  const weight = 6;

  let colors = satelliteTypes.map(k=>k.color);
  colors.push(...colors);

  ctx.lineWidth = weight;
  ctx.lineCap = 'round';

  for (let i = 0; i < colors.length; i++) {
    let angle = i*2*Math.PI/colors.length+rotation;
    let center = [radius*Math.cos(angle)+cWidth/2,
                  radius*Math.sin(angle)+cHeight/2];
    let rightAngle = angle + Math.PI/2;

    let p1 = [center[0]-length*Math.cos(rightAngle)/2,
              center[1]-length*Math.sin(rightAngle)/2];
    let p2 = [center[0]+length*Math.cos(rightAngle)/2,
              center[1]+length*Math.sin(rightAngle)/2];

    ctx.strokeStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(...p1);
    ctx.lineTo(...p2);
    ctx.stroke();
  }

  $('#title').css('text-shadow',
      `0 0 20px rgba(255,255,255,
      ${0.75+.25*Math.sin(2*elapsed)})`);
}

function drawStars() {
  gs.stars.map(s=>{
    let bri = Math.floor(Math.sin((Date.now()-gs.startTime)/500
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawMeteors() {
  Object.keys(gs.meteors).map(k=>drawMeteor(gs.meteors[k]));
}

function drawMeteor(m) {
  ctx.save();

  const center = getMeteorCenter(m);
  const gradient = ctx.createRadialGradient(
      center[0], center[1], 0,
      center[0], center[1], meteorSize);
  gradient.addColorStop(0.1, "#b39880");
  gradient.addColorStop(1, "#604b39");

  ctx.fillStyle = gradient;//'#a98c70';
  ctx.strokeStyle = m.type.color;
  ctx.lineWidth = .75;

  ctx.shadowColor = m.type.color;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(...getMeteorCoord(m,0));
  for (let i = 1; i < m.points.length; i++) {
    ctx.lineTo(...getMeteorCoord(m,i));
  }
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function getMeteorCoord(m,i) {
  const r = m.points[i][0];
  const theta = m.points[i][1];
  const angle = theta + m.rotation;

  const center = getMeteorCenter(m);
  const x = r*Math.cos(angle)+center[0];
  const y = r*Math.sin(angle)+center[1];

  return [x,y];
}

function getMeteorCenter(m) {
  const x = m.x + m.offset*Math.cos(m.rotation);
  const y = m.y + m.offset*Math.sin(m.rotation);
  return [x,y];
}

function drawSatellites() {
  const newHighlighted = [-1,-1];
  const minDist = [17,17];
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];
    if (s.r && s.theta) {
      s.x = s.r * Math.cos(s.theta) + cWidth/2;
      s.y = s.r * Math.sin(s.theta) + cHeight/2;
    }

    if (isSelected(k)) {
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+1,
                  {color:s.type.color, style:'fill'});
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+2,
                  {color:'white', weight:3, style:'stroke'});

    } else if (isConnected(k)){
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+2,
                  {color:s.type.color, style:'fill'});
    } else {
      let highlight = false;
      for (let i = 0; i < 2; i++) {
        const pType = getPlayerType(i);
        if (pType && pType != s.type) continue; // skip if wrong color
        if (pType && !gs.validConnection[i]) continue; // skip if crosses

        const dist = getDist([s.x,s.y], gs.playerPos[i]);
        if (dist < minDist[i]) { // only use the closest
          newHighlighted[i] = parseInt(k);
          minDist[i] = dist;
          highlight = true;
        }
      }

      const style =  highlight ? 'fill' : 'stroke';
      const expand = highlight ? 3 : 0;

      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+expand,
                  {color:s.type.color, weight:weight, style:style});
    }

  });
  gs.highlighted = newHighlighted;
}

function drawConnections() {
  // connect currently selected satellites
  ctx.save();
  ctx.lineCap = 'round';

  if (!(gs.selected[0] == -1 || gs.selected[1] == -1)) { // both selected
    const s = gs.satellites[gs.selected[0]];
    const t = gs.satellites[gs.selected[1]];

    const gradient = ctx.createLinearGradient(s.x,s.y,t.x,t.y);
    gradient.addColorStop(0, s.type.color);
    gradient.addColorStop(.375+Math.sin(Date.now()/300)*.125, 'white');
    gradient.addColorStop(.625-Math.sin(Date.now()/300)*.125, 'white');
    gradient.addColorStop(1, t.type.color);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  } else if (gs.selected[0]+gs.selected[1] > -2) { // one selected
    const i = gs.selected[0] == -1 ? 1 : 0; // index of selected
    if (gs.selected[i] > -1) {
      const s = gs.satellites[gs.selected[i]];

      ctx.strokeStyle = s.type.color;

      const valid = !crossesEarth([s.x,s.y],gs.playerPos[otherPlayer(i)]);
      gs.validConnection[otherPlayer(i)] = valid;

      const width = 2000/getDist([s.x,s.y], gs.playerPos[otherPlayer(i)]);

      if (valid) {
        ctx.lineWidth = Math.min(Math.max(width, .3), 7);
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

  // draw existing connections
  ctx.lineWidth = 4; //TODO: width based on distance?
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
