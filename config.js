const debug = true;

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
const fragmentSize = .6
const meteorBaseSpeed = .6;
const trailMax = [30, 130];
const trailInterval = 3;
const trailPhaseDuration = .3;

const warningSize = 35;
const warningMargin = 8;
const arrowSize = 14;
const arrowWidth = .4;

const earthRadius = 105;

const starCount = 120;

const framerate = 1/60;

const levels = [
  'Easy',
  'Normal',
  'Hard'
];

const helpMessages = {
  meteor: "There's a meteor heading for Earth! Try connecting two satellites to block it.",
  grabFirst: "Use your joystick & joy buttons to grab and hold a satellite that matches the color of an incoming meteor.",
  grabSecond: "Great! Now hold onto this satellite, while the other player grabs a matching one.",
  connect: "Quick, hit the center button to complete your connection!"
}

function configureLevel(level) {
  switch(level) {
    case 0:
      gs.startHealth = 5;

      gs.meteorSpeed = meteorBaseSpeed-.2; // .4
      gs.speedDelta = .08;
      gs.maxSpeed = 1.75;

      gs.meteorFrequency = 6;
      gs.frequencyDelta = .3;
      gs.minFrequency = 1.5;

      gs.maxMeteors = 4;
      gs.nextMeteor = 5;
      gs.accelerateDelay = 30;

      gs.gravityProbability = 0;
      break;
    case 1:
      gs.startHealth = 3;

      gs.meteorSpeed = meteorBaseSpeed; // .6
      gs.speedDelta = .1;
      gs.maxSpeed = 2;

      gs.meteorFrequency = 4;
      gs.frequencyDelta = .3;
      gs.minFrequency = .7;

      gs.maxMeteors = 5;
      gs.nextMeteor = 3;
      gs.accelerateDelay = 30;

      gs.gravityProbability = 0;
      break;
    case 2:
      gs.startHealth = 4;

      gs.meteorSpeed = meteorBaseSpeed+.2; // .8
      gs.speedDelta = .15;
      gs.maxSpeed = 2.5;

      gs.meteorFrequency = 3;
      gs.frequencyDelta = .4;
      gs.minFrequency = .5;

      gs.maxMeteors = 7;
      gs.nextMeteor = 2;
      gs.accelerateDelay = 25;

      gs.gravityProbability = .5;
      break;
    default:
      break;
  }
}
