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

const satelliteDensity = 8; // inversely proportional
const satelliteSize = 14;
const weight = 3;
const rspeed = .5;

const playerSize = 50;
const playerMargin = 18;
const innerMargin = playerMargin-8;

const meteorSize = 26;
const maxMeteors = 6;
const fragmentSize = .6
const meteorStartSpeed = .6;

const earthRadius = 105;

const starCount = 120;

const framerate = 1/60;

const levels = [
  'EASY',
  'NORMAL',
  'HARD'
];

let animationId;

// Setup functions

$(document).ready(function(){
  let $game = $('#game');
  gameCtx = $game[0].getContext('2d');
  cWidth = parseInt($game.attr('width'));
  cHeight = parseInt($game.attr('height'));

  let $earthCanvas = $('#earth-canvas');
  earthCtx = $earthCanvas[0].getContext('2d');
  eWidth = parseInt($earthCanvas.attr('width'));
  eHeight = parseInt($earthCanvas.attr('height'));

  let $playerCanvas = $('#player-canvas');
  playerCtx = $playerCanvas[0].getContext('2d');

  alignElements();
  $(window).resize(alignElements);

  preloadAudio();

  $(document).keyup(function(e) {
    if (gs.mode != 'game') return;
    switch(e.which) {
      case 67: // c
      case 86: // v
        gs.selected[0] = -1;
        break;
      case 78: // n
      case 77: // m
        gs.selected[1] = -1;
      default:
        gs.heldKeys.delete(e.which);
    }
  });

  $(document).keydown(function(e) {
    if (gs.mode == 'gameover') {
      if (Date.now()-gs.endTime > 1200) startTitles();
      return;
    }

    if (gs.mode == 'howto') {
      $('.overlay, #howto').hide();
      gs.mode = 'titles';
      return;
    }

    if (gs.mode == 'titles') {
      switch(e.which) {
        case 87: // w
        case 38: // up
        case 83: // s
        case 40: // down
          gs.activeBtn = !gs.activeBtn;
          playSound('select');
          break;
        case 37: // left
        case 65: // a
          if (gs.activeBtn == 1) {
            gs.level = (gs.level+levels.length-1)%levels.length;
            playSound('switch');
          }
          break;
        case 39: // right
        case 68: // d
          if (gs.activeBtn == 1) {
            gs.level = (gs.level+1)%levels.length;
            playSound('switch');
          }
          break;
        case 13: // return
        case 32: // space
        case 67: // c
        case 78: // n
          if (gs.activeBtn == 1) setTimeout(startGame,800);
          else {
            $('.overlay, #howto').show();
            gs.mode = 'howto';
          }
          playSound('start');
          break;
        default:
          break;
      }

      updateButtons();
      return;
    }

    switch(e.which) {
      case 67: // c
      case 86: // v
        selectWithPlayer(0);
        break;
      case 78: // n
      case 77: // m
        selectWithPlayer(1);
        break;
      case 32: // space
        if (!(gs.selected[0] == -1 || gs.selected[1] ==  -1)) {
          createConnection(gs.selected[0], gs.selected[1]);
          playSound('connect');
        }
        break;
      case 13: // return
        addMeteor();
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
  const scale = $game.height()/768;
  const earthScale = $game.height()/1080;

  $('#earth-canvas')
    .css('transform', `translate(-50%,-50%) scale(${earthScale})`);
  $('#text, #gameover, #howto')
    .css('transform', `translate(-50%,-50%) scale(${scale})`);
  $('#stats').css('transform',`translate(-50%,-50%)
                               scale(${scale})
                               translate(50%,50%)`)
             .css('margin', `${15*scale}px`)
             .css('left', $game.offset().left)
             .css('top', $game.offset().top);
  $('#credit').css('font-size', `${20*scale}px`)
              .css('margin', `${10*scale}px`)
              .css('right', $game.offset().left);
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);

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
    explosions: [],
    playerVector: [[0,0], [0,0]],
    heldKeys: new Set(),
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    lastAccelerateTime: Date.now(),
    lastMeteorTime: Date.now(),
    nextMeteor: 5000,
    meteorSpeed: meteorStartSpeed,
    meteorFrequency: 6,
    meteorsStopped: 0,
    shakeEarth: 0,
    redrawEarth: 1,
    hits: 0,
    mode: 'game',
    level: gs.level
  }

  const healthValues = [5,3,4];
  gs.startHealth = healthValues[gs.level];

  const placementMargin = 120;
  gs.playerPos = [[placementMargin, cHeight-placementMargin],
                  [cWidth-placementMargin, cHeight-placementMargin]];

  setupSatellites();
  setupStars();

  updateHealth();
  updateMeteorsStopped();

  function animate() {
    update();
    gs.lastUpdateTime = Date.now();
    draw();
    animationId = requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  setTimeout(()=>$('#stats').show(), 30);
}

function endGame() {
  cancelAnimationFrame(animationId);
  playSound('gameover');

  $('#stats').hide();
  $('#game, #earth-canvas, #player-canvas').css('filter','blur(5px)');

  $('#gameover div:nth-child(2)').html($('#timer').html());
  $('#gameover').show();

  gs.mode = 'gameover';
  gs.endTime = Date.now();
}

function startTitles() {
  $('#gameover').hide();
  $('.titleScreen').show();
  $('#game, #earth-canvas, #player-canvas').css('filter','none');

  gs = {
    stars: [],
    startTime: Date.now(),
    activeBtn: 0,
    mode: 'titles',
    level: 0
  }

  setupStars();
  updateButtons();
  earthCtx.clearRect(0,0,eWidth,eHeight);
  playerCtx.clearRect(0,0,cWidth,cHeight);

  function animate() {
    gameCtx.clearRect(0,0,cWidth,cHeight);
    drawStars(gameCtx);
    drawLogo(gameCtx);
    animationId = requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function setupStars() {
  gs.stars = [];
  for (let i = 0; i < starCount; i++) {
    const newStar = {};
    newStar.size = randFloat(3)+1.5;
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
  const space = 17;
  const diagonalRadius = Math.sqrt(Math.pow(cWidth/2,2)+
                              Math.pow(cHeight/2,2));
  const squareRadius = Math.min(cWidth, cHeight)/2;
  const maxRadius = (squareRadius-earthRadius-space)*.93;
  const orbitSpace = satelliteSize*2;
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
  newMeteor.offset = randInt(meteorSize/2);

  const grav = true;
  if (grav) newMeteor.motion = 'gravity';
  else newMeteor.motion = 'linear';

  if (grav) {
    const r = Math.sqrt(Math.pow(cWidth/2,2)+
                        Math.pow(cHeight/2,2))+
              meteorSize;
    const theta = randFloat(Math.PI*2);
    newMeteor.x = r*Math.cos(theta)+cWidth/2;
    newMeteor.y = r*Math.sin(theta)+cHeight/2;
  }
  else {
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
  }

  newMeteor.dt = randOffset(.03);
  newMeteor.dx = cWidth/2-newMeteor.x;
  newMeteor.dy = cHeight/2-newMeteor.y;

  if (grav) {
    let dxPerp, dyPerp;
    if (Math.random() > .5) {
      dxPerp = -newMeteor.dy;
      dyPerp = newMeteor.dx;
    } else {
      dxPerp = newMeteor.dy;
      dyPerp = -newMeteor.dx;
    }

    const minPerp = 0.5;
    const perpRange = 3;
    const perpCoeff = minPerp+randFloat(perpRange);

    newMeteor.dx += dxPerp*perpCoeff;
    newMeteor.dy += dyPerp*perpCoeff;
  }

  const coeff = (grav ? 3 : 1)*meteorStartSpeed
                /Math.sqrt(Math.pow(newMeteor.dx,2)+
                           Math.pow(newMeteor.dy,2));

  newMeteor.dx *= coeff;
  newMeteor.dy *= coeff;

/*  if (newMeteor.motion == 'gravity') {
    newMeteor.dx += randOffset(2);
    newMeteor.dy += randOffset(2);
  }*/

  gs.meteors[generateId()] = newMeteor;
}

function generateMeteorPoints() {
  const count = 6+randInt(6);
  const points = [];

  let theta = 0, r;
  while (theta < Math.PI*2) {
    r = meteorSize+randOffset(7);
    theta += .1+randFloat(2*Math.PI/count-.1);
    theta = Math.min(theta, Math.PI*2);

    points.push([r, theta]);
  }

  return points;
}

function addExplosion(x,y) {
  const newExplosion = {
    fragments: []
  }

  for (let i = 0; i < 5+randInt(4); i++) {
   const newFragment = {};
   const angle = randFloat(Math.PI*2);

   newFragment.x = x;
   newFragment.y = y;
   newFragment.dx = 2.8*Math.cos(angle);
   newFragment.dy = 2.8*Math.sin(angle);
   newFragment.color = `rgb(${143+randInt(30)},
                            ${112+randInt(30)},
                            ${86+randInt(30)})`;
   newFragment.size = fragmentSize+randFloat(.3)
   newFragment.points = generateMeteorPoints();

   newExplosion.fragments.push(newFragment);
  }
  gs.explosions.push(newExplosion);
}

function selectWithPlayer(player) {
  if (gs.selected[player] != -1) return;
  if (gs.highlighted[player] > -1) {
    const pType = getPlayerType(player);
    if (pType) {
      const hType = gs.satellites[gs.highlighted[player]].type;
      if (hType == pType) {
        gs.selected[player] = gs.highlighted[player];
        playSound('selectS2');
      } else playSound('whoosh');
    } else {
      gs.selected[player] = gs.highlighted[player];
      playSound('selectS1');
    }
  } else playSound('whoosh');
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

function getTimeScale() {
  const elapsed = (Date.now()-gs.lastUpdateTime)/1000;
  return elapsed/framerate;
}

// Update functions

function updateSatellites() {
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];
    if (isSelected(k) || isConnected(k)) return;
    s.theta += s.dt*getTimeScale();
  });
}

function updatePlayers() {
  const ts = getTimeScale();
  const acc = .4*ts;
  const dec = Math.pow(.9, ts);
  const max = 10;
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

    const newX = gs.playerPos[i][0]+gs.playerVector[i][0]*ts;
    const newY = gs.playerPos[i][1]+gs.playerVector[i][1]*ts;

    if (!isInBounds(newX, newY, 0)) {
      gs.playerVector[i] = [0,0];
      continue;
    }
    gs.playerPos[i] = [newX, newY];
  }
}

function updateMeteors() {
  const speedScale = gs.meteorSpeed / meteorStartSpeed;
  const scale = getTimeScale()*speedScale;

  // move existing meteors
  Object.keys(gs.meteors).map(k=>{
    const m = gs.meteors[k];

    if (m.motion == 'gravity') {
      const gravity = 5000;
      const drag = .9991;

      const distX = cWidth/2-m.x;
      const distY = cHeight/2-m.y;
      const diagonalDist = distToCenter(m.x, m.y);
      const sumDist = Math.abs(distX)+Math.abs(distY);

      const acc = scale*gravity/Math.pow(diagonalDist, 2);

      m.dx += acc*distX/sumDist;
      m.dy += acc*distY/sumDist;

      m.dx *= Math.pow(drag, scale);
      m.dy *= Math.pow(drag, scale);
    }

    m.x += m.dx*scale;
    m.y += m.dy*scale;

    m.rotation += m.dt*getTimeScale();

    // test for collision with planet
    const dist = distToCenter(...getMeteorCenter(m));
    if (dist < earthRadius+meteorSize) {
      gs.shakeEarth = Date.now();

      delete(gs.meteors[k]);
      addExplosion(m.x, m.y);
      playSound('explosion');

      gs.hits += 1;
      gs.redrawEarth = 1;
      updateHealth();

      if (gs.hits == gs.startHealth) setTimeout(()=> {
        cancelAnimationFrame(animationId);
        endGame();
      }, 1500);
    }

    // test for collision with line
    Object.keys(gs.connections).map(y=>{
      const c = gs.connections[y];
      if (c.color != m.type.color || c.phaseOut) return;

      const dist = distToLine(c.p1, c.p2, getMeteorCenter(m));
      if (dist < meteorSize) {
        c.phaseOut = Date.now();

        delete(gs.meteors[k]);
        addExplosion(m.x, m.y);
        playSound('zap');

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

  // increase difficulty every 25 sec
  if ((Date.now()-gs.lastAccelerateTime)/1000 > 25) {
    gs.meteorSpeed = Math.min(gs.meteorSpeed+.1, 2.3);
    gs.meteorFrequency = Math.max(gs.meteorFrequency-.5, 1);
    gs.lastAccelerateTime = Date.now();
  }
}

function updateExplosions() {
  gs.explosions = gs.explosions.filter(e=>{
    let exploding = true;
    e.fragments.filter(f=>{
      f.x += f.dx*getTimeScale();
      f.y += f.dy*getTimeScale();
      f.size -= 0.02*getTimeScale();
      if (f.size < 0) exploding = false;
    });
    if (exploding) return e;
  });
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
  $('#health').html('\u2764'.repeat(gs.startHealth-gs.hits));
}

function updateMeteorsStopped() {
  $('#stopped').html(gs.meteorsStopped);
}

function updateButtons() {
  for (let i = 0; i < 2; i++) {
    let $btn = $(`#btn${i+1}`);
    $btn.toggleClass('active',i == gs.activeBtn);
  }

  let btnLabel = 'START '+levels[gs.level];

  $('.indicator').toggle(gs.activeBtn == 1);
  $('#difficulty').html(btnLabel);
}

function update() {
  updateSatellites();
  updateMeteors();
  updateExplosions();
  updatePlayers();
  updateTimer();
}

// Draw functions

function draw() {
  gameCtx.clearRect(0,0,cWidth,cHeight);
  drawStars(gameCtx);
  drawSatellites(gameCtx);

  drawEarth(); // (using earthCtx)

  playerCtx.clearRect(0,0,cWidth,cHeight);
  drawConnections(playerCtx);
  drawMeteors(playerCtx);
  drawExplosions(playerCtx);
  drawPlayers(playerCtx);
}

function drawEarth() {
  if (gs.redrawEarth <= 0) return;
  gs.redrawEarth -= 1;

  let dx = 0, dy = 0;
  if (gs.shakeEarth) {
    gs.redrawEarth = 1;
    if (Date.now()-gs.shakeEarth > 300) gs.shakeEarth = 0;
    else if (Date.now()%3==0) {
      dx = randOffset(6);
      dy = randOffset(6);
    }
  }

  earthCtx.clearRect(0,0,eWidth,eHeight);
  earthCtx.filter = `sepia(${gs.hits/6})`;
  earthCtx.drawImage($(`#earth${Math.min(gs.hits+1,4)}`)[0],
      Math.floor(eWidth/2)-earthRadius+dx,
      Math.floor(eHeight/2)-earthRadius+dy,
      2*earthRadius,
      2*earthRadius);
}

function drawLogo(ctx) {
  const elapsed = (Date.now()-gs.startTime)/1000;
  const radius = 365+27*Math.sin(elapsed/1.5);
  const length = 675;
  const rotation = 3*Math.PI/10+elapsed/10;
  const weight = 8.5;

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

  const margin = 14+4*Math.sin(4*elapsed);
  $('.indicator').css('margin', margin);
}

function drawStars(ctx) {
  gs.stars.map(s=>{
    let bri = Math.floor(Math.sin((Date.now()-gs.startTime)/500
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawMeteors(ctx) {
  Object.keys(gs.meteors).map(k=>drawMeteor(ctx, gs.meteors[k]));
}

function drawMeteor(ctx, m) {
  ctx.save();

  const grv = m.motion == 'gravity';
  const center = getMeteorCenter(m);
  const gradient = ctx.createRadialGradient(
      center[0], center[1], 0,
      center[0], center[1], meteorSize);
  gradient.addColorStop(grv ? 0 : 0.1, grv ? "#888" : "#b39880");
  gradient.addColorStop(1, grv ? "#111" : "#604b39");

  ctx.fillStyle = gradient;
  ctx.strokeStyle = m.type.color;
  ctx.lineWidth = 1.4;

  ctx.shadowColor = m.type.color;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.moveTo(...getMeteorCoord(m,0));
  for (let i = 1; i < m.points.length; i++) {
    ctx.lineTo(...getMeteorCoord(m,i));
  }
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const polyColor = grv ? 'rgba(40,40,40,0.8)':
                          'rgba(96,75,57,0.65)';
  drawPolygon(ctx,
              center[0], center[1],
              m.type.sides, meteorSize/1.7,
              {color: polyColor,
               style:'fill', rotation:m.rotation});
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

function drawExplosions(ctx) {
  gs.explosions.map(e=>{
    e.fragments.map(f=>drawFragment(ctx, f));
  });
}

function drawFragment(ctx, f) {
  ctx.fillStyle = f.color;
  ctx.beginPath();

  for (let i = 0; i < f.points.length; i++) {
    const r = f.points[i][0]*f.size;
    const theta = f.points[i][1];
    const x = f.x+r*Math.cos(theta);
    const y = f.y+r*Math.sin(theta);

    if (i == 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }

  ctx.closePath();
  ctx.fill();
}

function drawSatellites(ctx) {
  const newHighlighted = [-1,-1];
  const minDist = [30,30];
  Object.keys(gs.satellites).map(k=>{
    const s = gs.satellites[k];
    if (s.r && s.theta) {
      s.x = s.r * Math.cos(s.theta) + cWidth/2;
      s.y = s.r * Math.sin(s.theta) + cHeight/2;
    }

    if (isSelected(k)) {
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+1.75,
                  {color:s.type.color, style:'fill'});
      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+3.5,
                  {color:'white', weight:4, style:'stroke'});

    } else if (!isConnected(k)){
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
      const expand = highlight ? 4.75 : 0;

      drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+expand,
                  {color:s.type.color, weight:weight, style:style});
    }

  });

  // draw connected satellites last
  gs.connected.forEach(id=>{
    const s = gs.satellites[id];
    drawPolygon(ctx, s.x, s.y, s.type.sides, satelliteSize+3.7,
               {color:s.type.color, style:'fill'});
  });

  gs.highlighted = newHighlighted;
}

function drawConnections(ctx) {
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
    ctx.lineWidth = 7;
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

      if (valid) {
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.5;
      }
      else {
        ctx.setLineDash([1,16]);
        ctx.globalAlpha = 0.8;
      }

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(...gs.playerPos[otherPlayer(i)]);
      ctx.stroke();
    }
  }

  ctx.restore();

  // draw existing connections
  ctx.lineWidth = 7;
  Object.keys(gs.connections).map(k=>{
    ctx.save();
    const cnctn = gs.connections[k];
    if (cnctn.phaseOut) {
      const phaseDuration = 0.6;
      const elapsed = (Date.now()-cnctn.phaseOut)/1000;

      if (elapsed > phaseDuration) {
        removeConnection(k);
        return;
      }

      ctx.setLineDash([20-elapsed*(20/phaseDuration),
                       elapsed*(20/phaseDuration)]);
      ctx.lineWidth = 7-elapsed*(7/phaseDuration);
    }

    ctx.strokeStyle = cnctn.color;
    ctx.beginPath();
    ctx.moveTo(...cnctn.p1);
    ctx.lineTo(...cnctn.p2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlayers(ctx) {
  for (let i = 0; i<2; i++) {
    drawPlayer(ctx, gs.playerPos[i][0], gs.playerPos[i][1],i);
  }
}

function drawPlayer(ctx, x, y, player, color) {
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
  ctx.shadowBlur = 12;

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

// Audio functions

function preloadAudio() {
  sounds = {}

  sounds.select = new Audio('./sound/select_btn.mp3');
  sounds.select.skipTo = 0.03;
  sounds.select.playbackRate = 1.2;
  sounds.select.volume = 0.2;

  sounds.switch = new Audio('./sound/switch.wav');
  sounds.switch.volume = 0.04;

  sounds.start = new Audio('./sound/start_game.wav');
  sounds.start.volume = 0.7;

  sounds.explosion = new Audio('./sound/explosion.wav');
  sounds.explosion.skipTo = 0.15;
  sounds.explosion.volume = 0.3;
  sounds.explosion.playbackRate = 2.5;

  sounds.zap = new Audio('./sound/zap.mp3');
  sounds.zap.skipTo= 0.1;
  sounds.zap.playbackRate = 3;
  sounds.zap.volume = 0.2;

  sounds.selectS1 = new Audio('./sound/laser.wav');
  sounds.selectS1.volume = 0.2;

  sounds.selectS2 = new Audio('./sound/laser_reverse.wav');
  sounds.selectS2.volume = 0.2;
  sounds.selectS2.playbackRate = 1.5;

  sounds.connect = new Audio('./sound/zap_reverse.mp3');
  sounds.connect.skipTo = 0.3;
  sounds.connect.playbackRate = 2.5;
  sounds.connect.volume = 0.4;

  sounds.whoosh = new Audio('./sound/whoosh.mp3');
  sounds.whoosh.volume = 0.15;

  sounds.gameover = new Audio('./sound/gameover.wav');
  sounds.gameover.volume = 0.3;

  Object.keys(sounds).map(k=>sounds[k].preload='auto');
}

function playSound(sound) {
  const s = sounds[sound];
  if (s) {
    s.pause();
    s.currentTime = s.skipTo || 0;
    s.play();
  }
}
