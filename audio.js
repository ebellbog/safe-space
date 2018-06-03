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
