let animationId;

$(document).ready(function(){
  $timer = $('#timer');
  gs = {};

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
        if (gs.selected[0] > -1) flashHelp('hold', 2.5);
        gs.selected[0] = -1;
        break;
      case 78: // n
      case 77: // m
        if (gs.selected[1] > -1) flashHelp('hold', 2.5);
        gs.selected[1] = -1;
      default:
        gs.heldKeys.delete(e.which);
    }
  });

  $(document).keydown(function(e) {
    if (gs.mode == 'gameover') {
      startTitles();
      return;
    }

    if (gs.mode == 'howto') {
      $('.overlay').hide();
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
          updateButtons();
          playSound('select');
          break;
        case 37: // left
        case 65: // a
          if (gs.activeBtn == 1) decreaseLevel();
          break;
        case 39: // right
        case 68: // d
          if (gs.activeBtn == 1) increaseLevel();
          break;
        case 13: // return
        case 32: // space
        case 67: // c
        case 78: // n
          selectButton(gs.activeBtn);
          break;
        default:
          break;
      }
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

          if (gs.help) {
            gs.help.flags.hold = 0;
            gs.help.flags.grabFirst = 0;
            gs.help.flags.grabSecond = 0;
            gs.help.flags.connect = 0;
          }
        } else playSound('whoosh');
        break;
      case 8: // backspace
        endGame();
        break;
      case 13: // return (for testing)
        break;
      default:
        gs.heldKeys.add(e.which);
        break;
    }
  });

  $('.arcade').toggle(mode == 'arcade');
  $('.browser').toggle(mode == 'browser');

  if (mode == 'arcade') $('body').css('cursor','none');
  else {
    helpMessages = Object.assign({}, helpMessages, browserHelp);

    $('#btn1').mouseover((e)=>{
      gs.activeBtn = 0;
      updateButtons();
    });
    $('#btn2').mouseover((e)=>{
      gs.activeBtn = 1;
      updateButtons();
    });

    $('.indicator').click((e)=>{
      e.stopPropagation();
      const btnIndex = $(e.target).index();
      if (btnIndex == 0) decreaseLevel();
      else increaseLevel();
      updateButtons();
    });

    $('#buttons div').click((e)=>{
      e.stopPropagation();
      const btnIndex = $(e.target).index();
      selectButton(btnIndex);
    });

    $('body').click(()=>{
      if (gs.mode == 'howto') {
        $('.overlay').hide();
        gs.mode = 'titles';
      } else if (gs.mode == 'game') {
        endGame();
      } else if (gs.mode == 'gameover') {
        startTitles();
      }
    });
  }

  startTitles();
});

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);

  $('.titleScreen').hide();

  gs = {
    satellites: {},
    highlighted: [-1,-1],
    selected: [-1,-1],
    connected: new Set(),
    connections: [],
    validConnection: [false, false],
    stars: [],
    meteors: {},
    warnings: {},
    explosions: [],
    playerVector: [[0,0], [0,0]],
    heldKeys: new Set(),
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    lastAccelerateTime: Date.now(),
    lastMeteorTime: Date.now(),
    meteorsStopped: 0,
    shakeEarth: 0,
    redrawEarth: 1,
    hits: 0,
    mode: 'game',
    level: gs.level
  }

  configureLevel(gs.level);

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
  if (debug) $('#debug').show();
  $('#help').show();
}

function endGame() {
  cancelAnimationFrame(animationId);
  playSound('gameover');

  $('#stats, #debug, #help').hide();
  $('#game, #earth-canvas, #player-canvas').css('filter','blur(5px)');

  $('#gameover div:nth-child(2)').html(
      `${$('#timer').html()} &nbsp;|&nbsp;
       ${$('#stopped').html()} meteors`);
  $('#gameover div:nth-child(3)').html(
      `Difficulty: ${levels[gs.level]}`);
  $('#gameover').show();

  gs.mode = 'gameover';
  gs.endTime = Date.now();
}

function startTitles() {
  if (gs.endTime && getElapsed(gs.endTime) < 1.2) return;

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
