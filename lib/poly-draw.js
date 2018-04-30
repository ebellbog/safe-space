function getPolyPath(x, y, sides, size, rotation, starred) {
  var rotation = rotation || (Math.PI-(Math.PI*2/sides))/2;
  var path = [];

  if (starred) sides = sides*2;
  for (var i = 0; i < sides; i++) {
    var dist = starred ? (i%2 ? size/2 : size) : size;
    var angle = (Math.PI*2/sides)*i + rotation;
    var ptX = x+dist*Math.cos(angle);
    var ptY = y+dist*Math.sin(angle);
    path.push({x: ptX, y:ptY});
  }
  return path;
}

function drawPolygon(ctx, x, y, sides, size, options) {
  options = options || {};

  var path = getPolyPath(x, y, sides, size, options.rotation, options.starred);
  var start = path.shift();

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  path.map(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();

  if (options.style=='fill') {
    if(options.color) ctx.fillStyle=options.color;
    ctx.fill();
  } else {
    if(options.color) ctx.strokeStyle=options.color;
    if(options.weight) ctx.lineWidth=options.weight;
    ctx.stroke();
  }
}

