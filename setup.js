function alignElements() {
  const gHeight = window.innerHeight;//$game.height();
  const gWidth = window.innerWidth;//$game.width();

  let scale, earthScale;
  const aspect = gHeight/gWidth;

  if (aspect >= 9/16) {
    $('.centered-full').css(
        {height: gWidth*9/16, width: gWidth});
    scale = gWidth/1365;
    earthScale = gWidth/1920;
  } else {
    $('.centered-full').css(
        {height: gHeight, width: gHeight*16/9});
    scale = gHeight/768;
    earthScale = gHeight/1080;
  }

  const $game = $('#game-wrapper');
  $('.centered-earth')
    .css('transform', `translate(-50%,-50%) scale(${earthScale})`);
  $('.centered')
    .css('transform', `translate(-50%,-50%) scale(${scale})`);
  $('#stats').css('transform',`translate(-50%,-50%)
                               scale(${scale})
                               translate(50%,50%)`)
             .css('margin', `${15*scale}px`)
             .css('left', $game.offset().left)
             .css('top', $game.offset().top);
  $('#credit').css('font-size', `${20*scale}px`)
              .css('margin', `${10*scale}px`)
              .css('right', $game.offset().left)
              .css('bottom', $game.offset().top);
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
