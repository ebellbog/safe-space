function randInt(max) {
  return Math.floor(Math.random()*max);
}

function randFloat(max) {
  return Math.random()*max;
}

function randOffset(max) {
  return (Math.random()-.5)*2*max;
}

function roundTo(num, digits) {
  return Math.floor(num*Math.pow(10,digits))/Math.pow(10,digits);
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

function perpSegment(p1, p2, length) {
  const dy = p2[1]-p1[1];
  const dx = p2[0]-p1[0];
  const dist = getDist(p1,p2);

  let angle = Math.asin(dy/dist);
  if (dx < 0) angle = Math.PI-angle;
  const perpAngle = angle+Math.PI/2;

  const s1 = [p2[0]+Math.cos(perpAngle)*length/2,
              p2[1]+Math.sin(perpAngle)*length/2];
  const s2 = [p2[0]-Math.cos(perpAngle)*length/2,
              p2[1]-Math.sin(perpAngle)*length/2];
  return [s1, s2];
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

function getElapsed(time) {
  return (Date.now()-time)/1000;
}

function getTimeScale() {
  return getElapsed(gs.lastUpdateTime)/framerate;
}
