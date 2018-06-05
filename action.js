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

function createConnection(id1,id2) {
  const s1 = gs.satellites[id1];
  const s2 = gs.satellites[id2];

  const newConnection = {};
  newConnection.id1 = id1;
  newConnection.p1 = [s1.x,s1.y];
  newConnection.id2 = id2;
  newConnection.p2 = [s2.x,s2.y];
  newConnection.color = s1.type.color;

  gs.connections.push(newConnection);
  gs.connected.add(id1).add(id2);
  for (let i = 0; i < 2; i++) {
    if (gs.selected[i] == id1 || gs.selected[i] == id2) gs.selected[i] = -1;
  }
}

function removeConnection(c) {
  gs.connected.delete(c.id1);
  gs.connected.delete(c.id2);
}

function addMeteor() {
  const newMeteor = {};
  newMeteor.points = generateMeteorPoints();
  newMeteor.type = satelliteTypes[randInt(5)];
  newMeteor.rotation = randFloat(2*Math.PI);
  newMeteor.offset = randInt(meteorSize/2);

  const grav = Math.random() < gs.gravityProbability;
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

  const coeff = (grav ? 3 : 1)*meteorBaseSpeed
                /Math.sqrt(Math.pow(newMeteor.dx,2)+
                           Math.pow(newMeteor.dy,2));

  newMeteor.dx *= coeff;
  newMeteor.dy *= coeff;

  newMeteor.warningId = -1;
  gs.meteors[generateId()] = newMeteor;
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

function addWarning(meteorId) {
  const m = gs.meteors[meteorId];
  const newWarning = {};

  newWarning.meteorId = meteorId;
  newWarning.type = m.type;

  newWarning.x = 0;
  newWarning.y = 0;
  newWarning.direction = 0;

  const wId = generateId();
  m.warningId = wId;
  gs.warnings[wId] = newWarning;
}
