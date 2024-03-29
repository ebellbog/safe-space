function update() {
  updateSatellites();
  updateMeteors();
  updateWarnings();
  updateExplosions();
  updatePlayers();
  updateTimer();
  updateDifficulty();
  if (gs.level === 0) updateHelp();
  if (debug) updateDebug();
}

function updateSatellites() {
  Object.keys(gs.satellites).forEach(k=>{
    const s = gs.satellites[k];
    if (isSelected(k) || isConnected(k)) return;
    s.theta += s.dt*getTimeScale();
  });
}

function updatePlayers() {
  const ts = getTimeScale();
  const acc = .5*ts;
  const dec = Math.pow(.9, ts);
  const max = 9;
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

    if (gs.help &&
        (gs.playerVector[i][0] || gs.playerVector[i][1])) {
      if (i == 0) gs.help.flags.moveP1 = 0;
      else gs.help.flags.moveP2 = 0;
    }

    if (!isInBounds(newX, newY, 0)) {
      gs.playerVector[i] = [0,0];
      continue;
    }
    gs.playerPos[i] = [newX, newY];
  }
}

function updateMeteors() {
  // move existing meteors
  const gravityScale = 0.4;
  const speedScale = gs.meteorSpeed / meteorBaseSpeed;
  const timeScale = getTimeScale();

  let minDist = cWidth;
  Object.keys(gs.meteors).forEach(k=>{
    const m = gs.meteors[k];

    if (m.phaseOut) {
      if (getElapsed(m.phaseOut) > trailPhaseDuration)
        delete(gs.meteors[k]);
      return;
    }

    const center = getMeteorCenter(m);
    const interval= getDist(m.trail.slice(-1)[0], center);

    // reset trail if too much delay between points
    // (likely due to switching tabs)
    if (interval > intervalMax) m.trail = [center];

    // add point to trail
    else if (interval > trailInterval) {
      m.trail.push(center);
      const diff = m.trail.length -
                   trailMax[m.motion=='gravity' ? 1 : 0];
      if (diff > 0) m.trail.splice(0, diff);
    }

    let scale = speedScale * timeScale;

    if (m.motion == 'gravity') {
      if (m.warningId == -1 &&
          !isInBounds(...getMeteorCenter(m), meteorSize))
            addWarning(k);

      scale =  Math.sqrt(speedScale) * timeScale * gravityScale;

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
    if (dist < minDist) minDist = dist;
    if (dist < earthRadius+meteorSize) {
      gs.shakeEarth = Date.now();

      phaseMeteor(m);
      playSound('explosion');

      gs.hits += 1;
      gs.redrawEarth = 1;
      updateHealth();

      if (gs.help && gs.meteorsStopped == 0) {
        gs.help.flags.grabFirst = 1;
        gs.help.flags.grabSecond =1 ;
      }

      if (gs.hits == gs.startHealth) setTimeout(()=> {
        cancelAnimationFrame(animationId);
        endGame();
      }, 1500);
    }

    // test for collision with line
    gs.connections.forEach(c=>{
      if ((c.color != m.type.color && !gs.help) || c.phaseOut)
        return;

      const dist = distToLine(c.p1, c.p2, getMeteorCenter(m));
      if (dist < meteorSize) {
        if (gs.help) {
          if (c.color != m.type.color) {
            flashHelp('missed', 2);
            return;
          } else gs.help.flags.missed = 0;
        }

        phaseConnection(c);
        phaseMeteor(m);
        playSound('zap');

        gs.meteorsStopped += 1;
        updateMeteorsStopped();

        flashHelp('congrats', 3);
      }
    });
  });

  // on easy mode, don't add meteor until both
  // players have figured out how to move
  if (gs.help) {
    gs.help.data.minDist = minDist;
    if (gs.help.flags.moveP1 + gs.help.flags.moveP2 == 0
        && gs.nextMeteor == 1000000) {
      gs.lastMeteorTime = Date.now();
      gs.nextMeteor = 4;
    }
  }

  // add new meteor
  if (getElapsed(gs.lastMeteorTime) > gs.nextMeteor
      && Object.keys(gs.meteors).length < gs.maxMeteors) {
     addMeteor();
     gs.lastMeteorTime = Date.now();
     gs.nextMeteor = 2*gs.meteorFrequency+
                     randInt(gs.meteorFrequency);
  }
}

function updateDifficulty() {
  const totalElapsed = getElapsed(gs.startTime);
  if (gs.level == 1) {
    if (totalElapsed > 180) gs.gravityProbability = .65;
    else if (totalElapsed > 90) gs.gravityProbability = .4;
    else if (totalElapsed > 45) gs.gravityProbability = .25;
  }
  else if (gs.level == 2) {
    if (totalElapsed > 60) gs.gravityProbability = .75;
    else if (totalElapsed > 120) gs.gravityProbability = .9;
  }

  if (getElapsed(gs.lastAccelerateTime) > gs.accelerateDelay) {
    gs.meteorSpeed = Math.min(gs.meteorSpeed+gs.speedDelta,
                              gs.maxSpeed);
    gs.meteorFrequency = Math.max(gs.meteorFrequency-gs.frequencyDelta,
                                  gs.minFrequency);
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
  const elapsed = getElapsed(gs.startTime);
  const min = Math.floor(elapsed/60);
  const sec = Math.floor(elapsed%60);
  const zero = sec < 10 ? '0' : '';

  const timeString = `${min}:${zero}${sec}`;
  $timer.html(timeString);
}

function updateHealth() {
  $health = $('#health').empty();
  $heart = $('#heart').clone().css('display','inline-block');
  for (let i = 0; i < gs.startHealth-gs.hits; i++) {
    $health.append($heart.clone());
  }
}

function updateMeteorsStopped() {
  $('#stopped').html(gs.meteorsStopped);
}

function updateButtons() {
  for (let i = 0; i < 2; i++) {
    let $btn = $(`#btn${i+1}`);
    $btn.toggleClass('active',i == gs.activeBtn);
  }

  let btnLabel = 'START';
  if (gs.level !== 1) {
    btnLabel += ` (${levels[gs.level].toUpperCase()})`;
  }

  $('.indicator').toggle(gs.activeBtn == 1);
  $('#difficulty').html(btnLabel);
}

function updateDebug() {
  let debugInfo = '';

  const framerate = getElapsed(gs.lastUpdateTime);
  debugInfo += "Framerate: 1/"+Math.floor(1/framerate)+"<br>";

  const nextMeteor = gs.nextMeteor-getElapsed(gs.lastMeteorTime);
  const meteorCount = Object.keys(gs.meteors).length;
  debugInfo += "<br>Next meteor in: "+roundTo(nextMeteor,2)+"<br>";
  debugInfo += "Meteors in play: "+meteorCount+"<br>";
  if (gs.help && meteorCount > 0) debugInfo += "Closest meteor: "
                                  +roundTo(gs.help.data.minDist,2)
                                  +"<br>";

  debugInfo += "<br>Meteor frequency: "+
               roundTo(gs.meteorFrequency,2)+"<br>";

  const rangeLower = roundTo(2*gs.meteorFrequency,2);
  const rangeUpper = roundTo(3*gs.meteorFrequency,2);
  debugInfo += `Expected range: (${rangeLower} - ${rangeUpper})<br>`;

  debugInfo += "Meteor speed: "+roundTo(gs.meteorSpeed,2)+"<br>";
  debugInfo += "Gravity probability: "+gs.gravityProbability+"<br>";

  const nextIncrease = gs.accelerateDelay-
                       getElapsed(gs.lastAccelerateTime);
  debugInfo += "<br>Next difficulty increase: "+
               roundTo(nextIncrease,2)+"<br>";

  debugInfo += "<br>Number of warnings: "+
               Object.keys(gs.warnings).length+"<br>";


  if (gs.help) {
    debugInfo += "<br> *Help flags* <br>";
    Object.keys(gs.help.flags).forEach(k => {
      debugInfo += `${k}: ${gs.help.flags[k]}<br>`;
    });
  }

  $('#debug').html(debugInfo);
}

function updateWarnings() {
  const totalMargin = warningMargin + warningSize + arrowSize;
  Object.keys(gs.warnings).forEach(k => {
    const w = gs.warnings[k];
    const m = gs.meteors[w.meteorId];
    if (isInBounds(...getMeteorCenter(m), meteorSize)) {
      m.warningId = -1;
      delete(gs.warnings[k]);
      return;
    }

    w.x = Math.min(Math.max(m.x, totalMargin),
                   cWidth-totalMargin);
    w.y = Math.min(Math.max(m.y, totalMargin),
                   cHeight-totalMargin);

    const dist = getDist([w.x,w.y], [m.x,m.y]);
    w.direction = Math.PI*2-Math.asin((w.y-m.y)/dist);
    if (m.x < w.x) w.direction = Math.PI-w.direction;
  });
}

function updateHelp() {
  if (!gs.help) {
    gs.help = {
      queue: [],
      displaying: false,
      flags: {
        'moveP1': 5,
        'moveP2': 5,
        'meteor': 1,
        'grabFirst': 1,
        'grabSecond': 1,
        'connect': 4,
        'hold': 2,
        'cross': 4,
        'missed': 1,
        'congrats': 1},
      data: {}};
  }

  const data = gs.help.data;

  if (getElapsed(gs.startTime) > 4.5) {
    if ((gs.help.flags.moveP1 + gs.help.flags.moveP2) % 2) {
      flashHelp('moveP2', 3);
      flashHelp('moveP1', 3);
    } else {
      flashHelp('moveP1', 3);
      flashHelp('moveP2', 3);
    }
  }

  if (gs.selected[0] > -1 && gs.selected[1] > -1) {
    flashHelp('connect', 2);
  }

  const meteorIds = Object.keys(gs.meteors);
  if (meteorIds.length > 0) {
    if (!data.meteorTime) {
      data.meteorTime = Date.now();
    }

    if (getElapsed(data.meteorTime) > 4) {
          flashHelp('meteor', 2);
    }

    if (gs.help.flags.grabFirst + gs.help.flags.grabSecond > 0
        && data.minDist < 600) {
      const selected = (gs.selected[0] > -1) +
                       (gs.selected[1] > -1);
      if (selected == 0) {
        if (flashHelp('grabFirst', 4)) {
          gs.help.flags.meteor = 0;
        }
      } else if (selected == 1) {
        if (flashHelp('grabSecond', 3)) {
          gs.help.flags.grabFirst = 0;
          gs.help.flags.meteor = 0;
        }
      }
    }
  }
}
