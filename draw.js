function draw() {
  gameCtx.clearRect(0,0,cWidth,cHeight);
  drawSatellites(gameCtx);

  drawStars(starCtx);

  drawEarth(); // (using earthCtx)

  playerCtx.clearRect(0,0,cWidth,cHeight);
  drawConnections(playerCtx);
  drawMeteors(playerCtx);
  drawExplosions(playerCtx);
  drawPlayers(playerCtx);
  drawWarnings(playerCtx);
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

  let sepia, spriteIndex;
  sepia = gs.hits/6;

  let h = Math.min(gs.hits, gs.startHealth);
  switch(gs.startHealth) {
    case 3:
      spriteIndex = h+1;
      break;
    case 4:
      spriteIndex = [1,2,2,3,4][h];
      break;
    case 5:
      spriteIndex = [1,2,2,3,3,4][h];
      break;
    default:
      break;
  }

  earthCtx.clearRect(0,0,eWidth,eHeight);
  earthCtx.filter = `sepia(${sepia})`;
  earthCtx.drawImage($(`#earth${spriteIndex}`)[0],
      Math.floor(eWidth/2)-earthRadius+dx,
      Math.floor(eHeight/2)-earthRadius+dy,
      2*earthRadius,
      2*earthRadius);
}

function drawLogo(ctx) {
  const elapsed = getElapsed(gs.titleStartTime);
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
}

function drawStars(ctx) {
  starCtx.clearRect(0, 0, cWidth, cHeight);
  gs.stars.forEach(s=>{
    let bri = Math.floor(Math.sin((Date.now()-gs.titleStartTime)/500
              +s.twinkle*100)*75+180);
    ctx.fillStyle=`rgb(${bri},${bri},${bri})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawMeteors(ctx) {
  Object.keys(gs.meteors).forEach(k=>{
    const m = gs.meteors[k];
    drawMeteorTrail(ctx, m);
    if (!m.phaseOut) drawMeteor(ctx, m);
  });
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

  ctx.beginPath();
  ctx.moveTo(...getMeteorCoord(m,0));
  for (let i = 1; i < m.points.length; i++) {
    ctx.lineTo(...getMeteorCoord(m,i));
  }
  ctx.closePath();

  ctx.fill();

  // create shadow blur effect more efficiently
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.globalAlpha = .4;
  ctx.stroke();

  ctx.lineWidth = 6;
  ctx.globalAlpha = .2;
  ctx.stroke();

  ctx.restore();

  // draw symbol at center of meteor
  const polyColor = grv ? 'rgba(40,40,40,0.8)':
                          'rgba(96,75,57,0.65)';
  drawPolygon(ctx,
              center[0], center[1],
              m.type.sides, meteorSize/1.7,
              {color: polyColor,
               style:'fill', rotation:m.rotation});
}

function drawMeteorTrail(ctx, m) {
  ctx.save();
  for (let i = 0; i < m.trail.length-3; i++) {
    const l1 = getSegmentLength(i, m);
    const l2 = getSegmentLength(i+1, m);

    const s1 = perpSegment(m.trail[i], m.trail[i+1], l1);
    const s2 = perpSegment(m.trail[i+1], m.trail[i+2], l2);

    ctx.fillStyle = m.type.color;
    ctx.strokeStyle = m.type.color;
    ctx.globalAlpha = getSegmentAlpha(i, m);
    ctx.lineWidth = .5;

    ctx.beginPath();
    ctx.moveTo(...s1[0]);
    ctx.lineTo(...s2[0]);
    ctx.lineTo(...s2[1]);
    ctx.lineTo(...s1[1]);
    ctx.fill();

    if (i == m.trail.length-4) {
      ctx.beginPath();
      ctx.arc(...m.trail[i+2], l2/2, s2[2]-Math.PI, s2[2]);
      ctx.fill();
    }
  }
  ctx.restore();
}

function getSegmentLength(i, m) {
  return 2.1*meteorSize*(i/m.trail.length);
}

function getSegmentAlpha(i, m) {
  let alpha =  i/m.trail.length;
  alpha *= (m.motion == 'gravity' ? .75 : .6);

  if (m.phaseOut) {
    alpha *= (trailPhaseDuration-getElapsed(m.phaseOut))/
      trailPhaseDuration;
  }
  return alpha;
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
  return [m.x, m.y];
}

function drawExplosions(ctx) {
  gs.explosions.forEach(e=>{
    e.fragments.forEach(f=>drawFragment(ctx, f));
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
  Object.keys(gs.satellites).forEach(k=>{
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
  // draw existing connections
  ctx.lineWidth = 7;
  gs.connections = gs.connections.filter(cnctn=>{
    ctx.save();
    if (cnctn.phaseOut) {
      const phaseDuration = 0.6;
      const elapsed = getElapsed(cnctn.phaseOut);

      if (elapsed > phaseDuration) {
        removeConnection(cnctn);
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

    return cnctn;
  });

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
        ctx.strokeStyle = s.type.color;
      }
      else {
        ctx.setLineDash([1,16]);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#aaa';
      }

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(...gs.playerPos[otherPlayer(i)]);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPlayers(ctx) {
  for (let i = 0; i<2; i++) {
    drawPlayer(ctx, gs.playerPos[i][0], gs.playerPos[i][1],i);
  }
}

function drawPlayer(ctx, x, y, player) {
  ctx.save();
  ctx.shadowBlur = 12;

  const s = gs.selected[otherPlayer(player)];
  if (s == -1) {
    ctx.fillStyle = player ? 'black' : 'white';
    ctx.shadowColor = player ? 'rgba(255,255,255,0.9)'
                             : 'rgba(0,0,0,.75)';
  } else {
    if (gs.validConnection[player] ||
        (gs.selected[player] > -1 &&
         gs.validConnection[otherPlayer(player)])) {
      ctx.shadowColor = 'black';
      ctx.fillStyle =  gs.satellites[s].type.color;
    } else {
      const xSize = playerSize/3.2;
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.moveTo(x-xSize, y-xSize);
      ctx.lineTo(x+xSize, y+xSize);
      ctx.moveTo(x+xSize, y-xSize);
      ctx.lineTo(x-xSize, y+xSize);
      ctx.stroke();
      ctx.restore();
      return;
    }
  }

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

function drawWarnings(ctx) {
  Object.keys(gs.warnings).forEach(
      k=>drawWarning(ctx, gs.warnings[k]));
}

function drawWarning(ctx, warning) {
  ctx.fillStyle = warning.type.color;

  ctx.beginPath();
  ctx.arc(warning.x, warning.y, warningSize, 0, Math.PI*2);
  ctx.fill();

  const sides = warning.type.sides;
  let size = warningSize*.75;
  if (sides == 3) size *= 1.15;
  else if (sides > 6) size *= 0.85;

  drawPolygon(ctx,
              warning.x, warning.y,
              sides, size,
              {color: 'rgba(0,0,0,0.4)', style:'fill'});

  ctx.font = "800 36px 'Exo 2'";
  ctx.fillStyle = warning.type.color;
  ctx.fillText('!', warning.x-6, warning.y+(sides == 3 ? 10 : 12));

  ctx.beginPath();
  size = warningSize;
  ctx.moveTo(size*Math.cos(warning.direction-arrowWidth)+warning.x,
             size*Math.sin(warning.direction-arrowWidth)+warning.y);
  ctx.lineTo(size*Math.cos(warning.direction+arrowWidth)+warning.x,
              size*Math.sin(warning.direction+arrowWidth)+warning.y);
  size += arrowSize;
  ctx.lineTo(size*Math.cos(warning.direction)+warning.x,
              size*Math.sin(warning.direction)+warning.y);
  ctx.fill();
}
