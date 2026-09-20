import { slidePose } from './football-slide';
import { setPieceTrajectory } from "./football-engine";
import { TRAINING_GATES } from "./football-training";
import { cameraTarget, stepCamera, DEFAULT_PRESENTATION, type PresentationSettings, type CameraFrame } from "./football-camera";
import { athletePose, createLocomotion, type Locomotion } from "./football-animation";
import { celebrationParticle, fireworkParticle, celebrationPose } from "./football-presentation";
import { WEAR_COLS } from "./football-pitch";
import {
  FIELD_H,
  FIELD_W,
  GOAL_BOTTOM,
  GOAL_TOP,
  attackDirectionFor,
  attackingGoalX,
  clamp,
  distance,
  getPlayer,
  type Ball,
  type MatchState,
  type Particle,
  type Player,
  type Quality,
  type Side,
  type Team,
  type TrailPoint,
  type View,
} from "./football-engine";
function project(view: View, x: number, y: number) {
  const t = y / FIELD_H;
  const top = view.height * 0.115;
  const bottom = view.height * 0.955;
  const inset = view.width * (0.075 - t * 0.045);
  const left = view.width * 0.025 + inset;
  const right = view.width * 0.975 - inset;
  return {
    x: left + (x / FIELD_W) * (right - left),
    y: top + t * (bottom - top),
  };
}

function traceWorldPolygon(
  ctx: CanvasRenderingContext2D,
  view: View,
  points: Array<[number, number]>,
) {
  points.forEach(([x, y], index) => {
    const p = project(view, x, y);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function drawWorldLine(
  ctx: CanvasRenderingContext2D,
  view: View,
  points: Array<[number, number]>,
) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const p = project(view, x, y);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function drawStadium(
  ctx: CanvasRenderingContext2D,
  view: View,
  quality: Quality,
  lighting: "night" | "day" = "night",
) {
  const bg = ctx.createLinearGradient(0, 0, 0, view.height);
  bg.addColorStop(0, lighting === "day" ? "#809ba9" : "#071018");
  bg.addColorStop(.45, lighting === "day" ? "#547680" : "#101b22");
  bg.addColorStop(1, lighting === "day" ? "#25444b" : "#020506");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, view.width, view.height);

  const glow = ctx.createRadialGradient(
    view.width * 0.5,
    0,
    0,
    view.width * 0.5,
    0,
    view.width * 0.65,
  );
  glow.addColorStop(0, "rgba(105,196,255,.20)");
  glow.addColorStop(1, "rgba(7,16,24,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, view.width, view.height * 0.55);

  ctx.fillStyle = "#18242b";
  ctx.fillRect(0, view.height * 0.04, view.width, view.height * 0.09);
  const dots =
    quality === "performance" ? 120 : quality === "balanced" ? 230 : 360;
  for (let index = 0; index < dots; index += 1) {
    const x = ((index * 83) % 997) / 997;
    const y = (((index * 47) % 199) / 199) * 0.07 + 0.05;
    const hue =
      index % 11 === 0 ? "#ffd60a" : index % 7 === 0 ? "#56cbff" : "#d5e0e5";
    ctx.globalAlpha = 0.2 + ((index * 17) % 10) / 25;
    ctx.fillStyle = hue;
    ctx.fillRect(x * view.width, y * view.height, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  const boardY = view.height * 0.128;
  const boardHeight = Math.max(7, view.height * 0.018);
  const boardGradient = ctx.createLinearGradient(0, boardY, view.width, boardY);
  boardGradient.addColorStop(0, "#ffd60a");
  boardGradient.addColorStop(0.25, "#37d8ff");
  boardGradient.addColorStop(0.5, "#ffd60a");
  boardGradient.addColorStop(0.75, "#3ee28a");
  boardGradient.addColorStop(1, "#ffd60a");
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = boardGradient;
  ctx.fillRect(0, boardY, view.width, boardHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(5,12,15,.82)";
  ctx.font = "900 " + Math.max(6, view.height * 0.011) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const boardLabels = [
    "STADLER FOOTBALL",
    "FAIR PLAY",
    "TITAN SPORTS",
    "NEXT LEVEL",
  ];
  boardLabels.forEach((label, index) => {
    ctx.fillText(
      label,
      ((index + 0.5) / boardLabels.length) * view.width,
      boardY + boardHeight / 2,
    );
  });

  if (quality !== "performance") {
    const leftLight = ctx.createRadialGradient(
      view.width * 0.12,
      view.height * 0.03,
      0,
      view.width * 0.12,
      view.height * 0.03,
      view.height * 0.3,
    );
    leftLight.addColorStop(0, "rgba(230,249,255,.18)");
    leftLight.addColorStop(1, "rgba(230,249,255,0)");
    ctx.fillStyle = leftLight;
    ctx.fillRect(0, 0, view.width * 0.45, view.height * 0.5);
    ctx.save();
    ctx.translate(view.width, 0);
    ctx.scale(-1, 1);
    ctx.fillRect(0, 0, view.width * 0.45, view.height * 0.5);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    traceWorldPolygon(ctx, view, [
      [0, 0],
      [100, 0],
      [100, 64],
      [0, 64],
    ]);
    ctx.clip();
    const pitchLight = ctx.createLinearGradient(
      view.width * 0.18,
      view.height * 0.12,
      view.width * 0.82,
      view.height * 0.95,
    );
    pitchLight.addColorStop(0, "rgba(209,255,224,.075)");
    pitchLight.addColorStop(0.48, "rgba(255,255,255,0)");
    pitchLight.addColorStop(1, "rgba(1,29,15,.11)");
    ctx.fillStyle = pitchLight;
    ctx.fillRect(0, 0, view.width, view.height);

    const wearSpots = [project(view, 7, 32), project(view, 93, 32)];
    wearSpots.forEach((spot) => {
      const wear = ctx.createRadialGradient(
        spot.x,
        spot.y,
        0,
        spot.x,
        spot.y,
        view.height * 0.055,
      );
      wear.addColorStop(0, "rgba(177,190,112,.14)");
      wear.addColorStop(1, "rgba(177,190,112,0)");
      ctx.fillStyle = wear;
      ctx.fillRect(
        spot.x - view.height * 0.07,
        spot.y - view.height * 0.04,
        view.height * 0.14,
        view.height * 0.08,
      );
    });
    ctx.restore();
  }

  if (quality !== "performance") {
    const crest = project(view, 50, 32);
    const crestRadius = clamp(view.height * 0.052, 19, 42);
    ctx.save();
    ctx.globalAlpha = quality === "ultra" ? 0.13 : 0.085;
    ctx.strokeStyle = "#ecfff1";
    ctx.lineWidth = Math.max(1.2, view.height / 430);
    ctx.beginPath();
    ctx.arc(crest.x, crest.y, crestRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(crest.x, crest.y, crestRadius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ecfff1";
    ctx.font = "950 " + crestRadius * 0.67 + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SF", crest.x, crest.y + crestRadius * 0.04);
    ctx.restore();
  }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  view: View,
  quality: Quality,
  state: MatchState,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.72)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  traceWorldPolygon(ctx, view, [
    [0, 0],
    [100, 0],
    [100, 64],
    [0, 64],
  ]);
  ctx.fillStyle = "#14753c";
  ctx.fill();
  ctx.restore();

  for (let stripe = 0; stripe < 8; stripe += 1) {
    ctx.beginPath();
    traceWorldPolygon(ctx, view, [
      [0, stripe * 8],
      [100, stripe * 8],
      [100, (stripe + 1) * 8],
      [0, (stripe + 1) * 8],
    ]);
    ctx.fillStyle = stripe % 2 === 0 ? "#1c8748" : "#157b40";
    ctx.fill();
  }

  if (quality !== "performance") {
    for (let stripe = 0; stripe < 10; stripe += 1) {
      ctx.beginPath();
      traceWorldPolygon(ctx, view, [
        [stripe * 10, 0],
        [(stripe + 1) * 10, 0],
        [(stripe + 1) * 10, 64],
        [stripe * 10, 64],
      ]);
      ctx.fillStyle =
        stripe % 2 === 0 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.018)";
      ctx.fill();
    }

    const grassDetails = quality === "ultra" ? 320 : 150;
    ctx.save();
    ctx.lineWidth = 0.55;
    for (let index = 0; index < grassDetails; index += 1) {
      const worldX = ((index * 47 + 13) % 997) / 9.97;
      const worldY = ((index * 83 + 29) % 631) / 9.86;
      const grass = project(view, worldX, worldY);
      ctx.strokeStyle =
        index % 3 === 0 ? "rgba(220,255,226,.11)" : "rgba(1,45,21,.14)";
      ctx.beginPath();
      ctx.moveTo(grass.x, grass.y);
      ctx.lineTo(grass.x + (index % 2 ? 1.1 : -0.8), grass.y - 1.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(244,255,246,.82)";
  ctx.lineWidth = Math.max(1, view.height / 560);
  drawWorldLine(ctx, view, [
    [0, 0],
    [100, 0],
    [100, 64],
    [0, 64],
    [0, 0],
  ]);
  drawWorldLine(ctx, view, [
    [50, 0],
    [50, 64],
  ]);
  drawWorldLine(ctx, view, [
    [0, 15],
    [17, 15],
    [17, 49],
    [0, 49],
  ]);
  drawWorldLine(ctx, view, [
    [100, 15],
    [83, 15],
    [83, 49],
    [100, 49],
  ]);
  drawWorldLine(ctx, view, [
    [0, 23],
    [6, 23],
    [6, 41],
    [0, 41],
  ]);
  drawWorldLine(ctx, view, [
    [100, 23],
    [94, 23],
    [94, 41],
    [100, 41],
  ]);

  const circle: Array<[number, number]> = [];
  for (let index = 0; index <= 40; index += 1) {
    const angle = (index / 40) * Math.PI * 2;
    circle.push([50 + Math.cos(angle) * 9.2, 32 + Math.sin(angle) * 9.2]);
  }
  drawWorldLine(ctx, view, circle);
  const center = project(view, 50, 32);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 2, 0, Math.PI * 2);
  ctx.fill();

  const penaltySpots = [project(view, 11, 32), project(view, 89, 32)];
  penaltySpots.forEach((spot) => {
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  const leftArc: Array<[number, number]> = [];
  const rightArc: Array<[number, number]> = [];
  for (let index = 0; index <= 18; index += 1) {
    const leftAngle = -0.94 + (index / 18) * 1.88;
    const rightAngle = Math.PI - 0.94 + (index / 18) * 1.88;
    leftArc.push([
      11 + Math.cos(leftAngle) * 9.2,
      32 + Math.sin(leftAngle) * 9.2,
    ]);
    rightArc.push([
      89 + Math.cos(rightAngle) * 9.2,
      32 + Math.sin(rightAngle) * 9.2,
    ]);
  }
  drawWorldLine(ctx, view, leftArc);
  drawWorldLine(ctx, view, rightArc);

  const cornerSpecs: Array<[number, number, number, number]> = [
    [0, 0, 0, Math.PI / 2],
    [100, 0, Math.PI / 2, Math.PI],
    [100, 64, Math.PI, Math.PI * 1.5],
    [0, 64, Math.PI * 1.5, Math.PI * 2],
  ];
  cornerSpecs.forEach(([cx, cy, start, end]) => {
    const points: Array<[number, number]> = [];
    for (let index = 0; index <= 8; index += 1) {
      const angle = start + ((end - start) * index) / 8;
      points.push([cx + Math.cos(angle) * 2.2, cy + Math.sin(angle) * 2.2]);
    }
    drawWorldLine(ctx, view, points);
  });

  drawGoal(ctx, view, "home", state.netPulse);
  drawGoal(ctx, view, "away", state.netPulse);
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  view: View,
  side: Side,
  netPulse: number,
) {
  const x = side === "home" ? 0 : 100;
  const outsideX =
    side === "home" ? -3.6 - netPulse * 1.4 : 103.6 + netPulse * 1.4;
  const a = project(view, x, GOAL_TOP);
  const b = project(view, x, GOAL_BOTTOM);
  const c = project(view, outsideX, GOAL_TOP + 1);
  const d = project(view, outsideX, GOAL_BOTTOM - 1);
  ctx.save();
  const netGlow = ctx.createLinearGradient(a.x, a.y, c.x, c.y);
  netGlow.addColorStop(0, "rgba(255,255,255,.1)");
  netGlow.addColorStop(1, "rgba(130,225,255,.02)");
  ctx.fillStyle = netGlow;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(239,250,255,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 0.7;
  for (let index = 1; index < 5; index += 1) {
    const t = index / 5;
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    ctx.lineTo(c.x + (d.x - c.x) * t, c.y + (d.y - c.y) * t);
    ctx.stroke();
  }
  for (let index = 1; index < 4; index += 1) {
    const t = index / 4;
    ctx.beginPath();
    ctx.moveTo(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t);
    ctx.lineTo(b.x + (d.x - b.x) * t, b.y + (d.y - b.y) * t);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

const playerMotions = new WeakMap<Player, Locomotion>();

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  view: View,
  player: Player,
  team: Team,
  selected: boolean,
  quality: Quality,
  dt: number,
) {
  const p = project(view, player.x, player.y);
  const depthScale = 0.78 + (player.y / FIELD_H) * 0.28;
  const size = clamp(view.height / 48, 8, 14) * depthScale * (player.appearance?.height??180)/180;
  const speed = Math.hypot(player.vx, player.vy);
  let motion = playerMotions.get(player);
  if (!motion) { motion=createLocomotion(player);playerMotions.set(player,motion); }
  const pose = athletePose(player,motion,dt);
  const stride=pose.stride[0]*size*.65;
  const swingX=stride*(Math.abs(player.facingX)>.25?player.facingX:.3);
  const swingY=stride*player.facingY*.5;
  const kick=pose.kick*size*.45;
  const kitPrimary =
    player.role === "GK"
      ? player.side === "home"
        ? "#8dff5a"
        : "#ff714b"
      : team.primary;
  const kitSecondary =
    player.role === "GK"
      ? player.side === "home"
        ? "#17390f"
        : "#4a130b"
      : team.secondary;
  const kitShorts = player.role === "GK" ? kitSecondary : team.shorts;
  const kitSocks = player.role === "GK" ? kitPrimary : team.socks;

  ctx.save();
  ctx.translate(p.x, p.y-pose.bob*size*1.8);
  ctx.rotate(pose.bank*.4);
  if (
    player.role === "GK" &&
    player.keeperDiveTimer > 0 &&
    quality !== "performance"
  ) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = kitPrimary;
    ctx.translate(0, -player.keeperDiveDirection * size * 0.58);
    ctx.rotate(player.keeperDiveDirection * 0.24);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.66, size * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (speed > 15 && quality !== "performance" && player.slideTimer <= 0) {
    ctx.strokeStyle = "rgba(220,248,255,.22)";
    ctx.lineWidth = 1.2;
    for (let streak = 1; streak <= 2; streak += 1) {
      ctx.beginPath();
      ctx.moveTo(-player.facingX * size * (0.6 + streak * 0.3), size * 0.2);
      ctx.lineTo(-player.facingX * size * (1.2 + streak * 0.45), size * 0.35);
      ctx.stroke();
    }
  }
  if (player.role === "GK" && player.keeperDiveTimer > 0) {
    ctx.rotate(player.keeperDiveDirection * 0.34);
    ctx.scale(1.08, 0.9);
  } else if (player.slideState) {
    const ground=slidePose(player)!.ground;ctx.rotate(player.facingY*.48*ground);ctx.translate(player.facingX*size*.28*ground,size*.28*ground);ctx.scale(1+.34*ground,1-.36*ground);
  } else if (player.slideTimer > 0) {
    ctx.rotate(player.facingY * 0.48);
    ctx.translate(player.facingX * size * 0.28, size * 0.28);
    ctx.scale(1.34, 0.64);
  } else if (player.stealTimer > 0) {
    ctx.rotate(player.facingY * 0.18);
    ctx.translate(player.facingX * size * 0.2, size * 0.08);
    ctx.scale(1.12, 0.92);
  } else if (player.stumbleTimer > 0) {
    ctx.rotate(-player.facingY * 0.2);
  }
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(1.5, size * 0.8, size * 0.75, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    const selectionPulse = 0.82 + Math.sin(performance.now() * 0.008) * 0.12;
    ctx.strokeStyle = team.primary;
    ctx.globalAlpha = selectionPulse;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.45, size, size * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = team.primary;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.75);
    ctx.lineTo(-size * 0.38, -size * 2.3);
    ctx.lineTo(size * 0.38, -size * 2.3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = kitShorts;
  ctx.lineWidth = Math.max(2, size * 0.23);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.25, size * 0.2);
  ctx.lineTo(-size * 0.4 + player.facingX * size * 0.15 + swingX, size * 0.78 + swingY);
  ctx.moveTo(size * 0.25, size * 0.2);
  ctx.lineTo(size * 0.4 + player.facingX * size * 0.15 - swingX + kick*player.facingX, size * 0.78 - swingY + kick*player.facingY);
  ctx.stroke();

  ctx.strokeStyle = kitSocks;
  ctx.lineWidth = Math.max(1.2, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(-size * .39+swingX*.6, size*.58+swingY*.6);
  ctx.lineTo(-size*.42+swingX,size*.82+swingY);
  ctx.moveTo(size*.39-swingX*.6,size*.58-swingY*.6);
  ctx.lineTo(size*.42-swingX+kick*player.facingX,size*.82-swingY+kick*player.facingY);
  ctx.stroke();

  ctx.strokeStyle = player.appearance?.skin ?? "#e8ad7d";
  ctx.lineWidth = Math.max(1.6, size * 0.18);
  ctx.beginPath();
  ctx.moveTo(-size * 0.48, -size * 0.55);
  ctx.lineTo(-size * 0.72 - player.facingY * size * 0.12 - swingX*.4, -size*.05-swingY*.5+(player.action==="celebrate"&&player.actionTimer>0?-size*1.3:0));
  ctx.moveTo(size * 0.48, -size * 0.55);
  ctx.lineTo(size * 0.72 + player.facingY * size * 0.12 + swingX*.4, -size*.05+swingY*.5+(player.action==="celebrate"&&player.actionTimer>0&&player.appearance?.celebration!=="point"?-size*1.3:0));
  ctx.stroke();

  if (player.role !== "GK") {
    ctx.strokeStyle =
      team.kitPattern === "white-sleeves" ? team.secondary : team.primary;
    ctx.lineWidth = Math.max(1.4, size * 0.24);
    ctx.beginPath();
    ctx.moveTo(-size * 0.48, -size * 0.58);
    ctx.lineTo(-size * 0.59 - player.facingY * size * 0.04, -size * 0.34);
    ctx.moveTo(size * 0.48, -size * 0.58);
    ctx.lineTo(size * 0.59 + player.facingY * size * 0.04, -size * 0.34);
    ctx.stroke();
  }

  if (player.role === "GK") {
    ctx.fillStyle = "#f5fbff";
    ctx.beginPath();
    ctx.arc(-size * 0.78, -size * 0.03, size * 0.19, 0, Math.PI * 2);
    ctx.arc(size * 0.78, -size * 0.03, size * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(25,45,55,.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const jersey = ctx.createLinearGradient(-size, -size, size, size);
  jersey.addColorStop(0, kitPrimary);
  jersey.addColorStop(1, player.role === "GK" ? kitSecondary : kitPrimary);
  ctx.fillStyle = jersey;
  ctx.beginPath();
  ctx.roundRect(
    -size * 0.53,
    -size * 0.88,
    size * 1.06,
    size * 1.18,
    size * 0.36,
  );
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
  if (player.role !== "GK") {
    ctx.save();
    ctx.clip();
    if (team.kitPattern === "horizontal") {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.56, -size * 0.47, size * 1.12, size * 0.2);
      ctx.fillRect(-size * 0.56, -size * 0.02, size * 1.12, size * 0.2);
    } else if (team.kitPattern === "vertical") {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.43, -size * 0.9, size * 0.18, size * 1.24);
      ctx.fillRect(size * 0.24, -size * 0.9, size * 0.18, size * 1.24);
      if (team.kitAccent) {
        ctx.fillStyle = team.kitAccent;
        ctx.fillRect(-size * 0.08, -size * 0.9, size * 0.16, size * 1.24);
      }
    } else if (team.kitPattern === "sash") {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = team.secondary;
      ctx.translate(-size * 0.02, -size * 0.24);
      ctx.rotate(-0.62);
      ctx.fillRect(-size * 0.13, -size * 0.9, size * 0.27, size * 1.8);
    } else if (team.kitPattern === "chest-band") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.56, -size * 0.35, size * 1.12, size * 0.15);
      ctx.fillStyle = team.kitAccent ?? "#151515";
      ctx.fillRect(-size * 0.56, -size * 0.2, size * 1.12, size * 0.15);
    } else if (team.kitPattern === "center-stripe") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = team.kitAccent ?? "#f5f5f5";
      ctx.fillRect(-size * 0.16, -size * 0.9, size * 0.32, size * 1.24);
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.085, -size * 0.9, size * 0.17, size * 1.24);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.24)";
      ctx.fillRect(-size * 0.055, -size * 0.84, size * 0.11, size * 1.02);
    }
    ctx.restore();
  }

  if (player.role !== "GK") {
    ctx.strokeStyle = team.secondary;
    ctx.lineWidth = Math.max(0.7, size * 0.065);
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.81);
    ctx.quadraticCurveTo(0, -size * 0.67, size * 0.22, -size * 0.81);
    ctx.stroke();
    if (team.kitPattern === "solid" && team.kitAccent) {
      ctx.strokeStyle = team.kitAccent;
      ctx.lineWidth = Math.max(0.6, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(-size * 0.43, -size * 0.68);
      ctx.lineTo(-size * 0.28, -size * 0.78);
      ctx.moveTo(size * 0.43, -size * 0.68);
      ctx.lineTo(size * 0.28, -size * 0.78);
      ctx.stroke();
    }
  }

  if (player.role === "GK") {
    ctx.strokeStyle = "rgba(255,255,255,.58)";
    ctx.lineWidth = Math.max(0.8, size * 0.075);
    ctx.beginPath();
    ctx.moveTo(-size * 0.36, -size * 0.52);
    ctx.lineTo(size * 0.36, -size * 0.52);
    ctx.stroke();
  }

  ctx.fillStyle = player.appearance?.skin ?? "#f0bc8b";
  ctx.beginPath();
  ctx.arc(0, -size * 1.15, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.appearance?.style === "bald" ? (player.appearance.skin) : player.appearance?.hair ?? "#17191c";
  ctx.beginPath();
  ctx.ellipse(0,-size*1.27,size*(player.appearance?.style==="mohawk"?.13:.31),size*.31,0,Math.PI,Math.PI*2);
  ctx.fill();

  ctx.fillStyle = kitSecondary;
  ctx.font = "700 " + Math.max(7, size * 0.58) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(player.number), 0, -size * 0.28);

  if (player.yellowCards > 0) {
    ctx.fillStyle = "#ffe000";
    ctx.strokeStyle = "rgba(0,0,0,.42)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(size * 0.62, -size * 1.72, size * 0.34, size * 0.48, 1);
    ctx.fill();
    ctx.stroke();
  }

  if (selected && quality !== "performance") {
    const label = player.name.toUpperCase();
    ctx.font = "800 " + Math.max(8, size * 0.58) + "px Arial";
    const width = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(4,9,12,.84)";
    ctx.beginPath();
    ctx.roundRect(-width / 2, size * 1.05, width, size * 0.9, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, 0, size * 1.5);
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, view: View, ball: Ball) {
  const p = project(view, ball.x, ball.y);
  const liftPixels = ball.z * clamp(view.height / 92, 5.4, 10.5);
  const ballY = p.y - liftPixels;
  const radius =
    clamp(view.height / 150, 3.1, 5.4) *
    (0.82 + (ball.y / FIELD_H) * 0.22) *
    (1 + Math.min(0.16, ball.z * 0.018));
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0," + clamp(0.34 - ball.z * 0.035, 0.1, 0.34) + ")";
  ctx.beginPath();
  ctx.ellipse(
    p.x + 1.5,
    p.y + radius * 1.5,
    radius * (1.25 + ball.z * 0.03),
    radius * 0.55,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const gradient = ctx.createRadialGradient(
    p.x - radius * 0.35,
    ballY - radius * 0.45,
    0,
    p.x,
    ballY,
    radius * 1.3,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.68, "#eef3f4");
  gradient.addColorStop(1, "#8b979d");
  ctx.fillStyle = gradient;
  if (ball.z > 0.85) {
    ctx.shadowColor = "rgba(218,248,255,.62)";
    ctx.shadowBlur = Math.min(15, 4 + ball.z * 1.4);
  }
  ctx.beginPath();
  ctx.arc(p.x, ballY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#172129";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(
    p.x + Math.cos(ball.spin + performance.now() * 0.01) * radius * 0.2,
    ballY,
    radius * 0.32,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

function drawDefensiveCue(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
  quality: Quality,
) {
  const owner = getPlayer(state, state.ball.owner);
  if (!owner) return;
  const controlled = [getPlayer(state, state.selectedId)];
  if (state.gameMode === "local2p") {
    controlled.push(getPlayer(state, state.selectedAwayId));
  }
  controlled.forEach((player) => {
    if (!player || player.side === owner.side || player.role === "GK") return;
    const pressDistance = distance(player.x, player.y, owner.x, owner.y);
    if (pressDistance > 6.2) return;
    const from = project(view, player.x, player.y);
    const target = project(view, owner.x, owner.y);
    const color =
      player.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
    const readiness = clamp(1 - pressDistance / 6.2, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.28 + readiness * 0.48;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3 + readiness * 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 9 + (1 - readiness) * 4, 0, Math.PI * 2);
    ctx.stroke();
    if (quality !== "performance") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  });
}

function drawBallTrail(
  ctx: CanvasRenderingContext2D,
  view: View,
  trail: TrailPoint[],
) {
  trail.forEach((point, index) => {
    const p = project(view, point.x, point.y);
    const liftPixels = point.z * clamp(view.height / 92, 5.4, 10.5);
    const size = 1.5 + (index / Math.max(1, trail.length)) * 2.3;
    ctx.globalAlpha = clamp(point.life * 0.52, 0, 0.42);
    ctx.fillStyle = "#e9fbff";
    ctx.beginPath();
    ctx.arc(p.x, p.y - liftPixels, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSetPieceGuide(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
) {
  const path=setPieceTrajectory(state);
  if(path.length){ctx.save();ctx.strokeStyle='#c8ff83';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();path.forEach((p,i)=>{const q=project(view,p.x,p.y);const y=q.y-p.z*view.height/100;if(i)ctx.lineTo(q.x,y);else ctx.moveTo(q.x,y);});ctx.stroke();ctx.restore();return;}
  const piece = state.setPiece;
  if (
    !piece ||
    !piece.ready ||
    (piece.side === "away" && state.gameMode !== "local2p")
  ) {
    return;
  }
  const from = project(view, piece.spotX, piece.spotY);
  const attackDirection = attackDirectionFor(state, piece.side);
  let targetX = attackingGoalX(state, piece.side, 3);
  let targetY = piece.aimY;
  if (piece.kind === "corner") {
    targetX = attackingGoalX(state, piece.side) - attackDirection * 13;
    targetY = 32;
  } else if (piece.kind === "throwIn") {
    targetX = clamp(piece.spotX + attackDirection * 13, 5, 95);
    targetY = piece.spotY < 32 ? 11 : 53;
  } else if (piece.kind === "goalKick") {
    targetX = piece.spotX + attackDirection * 31;
    targetY = 32;
  } else if (piece.kind === "offside") {
    targetX = piece.spotX + attackDirection * 14;
    targetY = piece.spotY;
  }
  const to = project(view, targetX, targetY);
  const guideColor =
    piece.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(to.x, to.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x - 11, to.y);
  ctx.lineTo(to.x + 11, to.y);
  ctx.moveTo(to.x, to.y - 11);
  ctx.lineTo(to.x, to.y + 11);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  view: View,
  particles: Particle[],
) {
  particles.forEach((particle) => {
    const p = project(view, particle.x, particle.y);
    ctx.globalAlpha = clamp(particle.life, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(p.x, p.y, particle.size, particle.size * 1.8);
  });
  ctx.globalAlpha = 1;
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
) {
  const width = clamp(view.width * 0.18, 120, 184);
  const height = width * 0.38;
  const x = view.width / 2 - width / 2;
  const y = view.height - height - 9;
  ctx.save();
  ctx.fillStyle = "rgba(3,9,12,.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.3)";
  ctx.strokeRect(x + 7, y + 7, width - 14, height - 14);
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + 7);
  ctx.lineTo(x + width / 2, y + height - 7);
  ctx.stroke();
  state.players.forEach((player) => {
    if (player.sentOff) return;
    ctx.fillStyle =
      player.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
    ctx.beginPath();
    ctx.arc(
      x + 7 + (player.x / FIELD_W) * (width - 14),
      y + 7 + (player.y / FIELD_H) * (height - 14),
      player.id === state.selectedId ||
        (state.gameMode === "local2p" && player.id === state.selectedAwayId)
        ? 3.2
        : 2.1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(
    x + 7 + (state.ball.x / FIELD_W) * (width - 14),
    y + 7 + (state.ball.y / FIELD_H) * (height - 14),
    1.8,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawPitchWear(ctx: CanvasRenderingContext2D, view: View, state: MatchState) {
  ctx.save();
  state.pitchWear.cells.forEach((wear, index) => {
    if (wear < .012) return;
    const p = project(view, (index % WEAR_COLS) * 2 + 1, Math.floor(index / WEAR_COLS) * 2 + 1);
    const stain = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,view.width/55);
    stain.addColorStop(0,`rgba(83,64,34,${Math.min(.32,wear*.4)})`);
    stain.addColorStop(1,"rgba(83,64,34,0)");ctx.fillStyle=stain;
    ctx.beginPath(); ctx.ellipse(p.x,p.y,view.width/55,view.height/38,0,0,Math.PI*2); ctx.fill();
  });
  for (const mark of state.pitchWear.marks) {
    const a=project(view,mark.x,mark.y), b=project(view,mark.x+mark.dx,mark.y+mark.dy);
    ctx.strokeStyle="rgba(103,72,37,.6)";ctx.lineWidth=Math.max(1,view.width/220);ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.restore();
}

const ceremonyBackdrops = new WeakMap<MatchState, { width: number; height: number; canvas: HTMLCanvasElement }>();

function drawTitleCeremony(ctx: CanvasRenderingContext2D, view: View, state: MatchState) {
  const c=state.celebration!;
  const team=c.winner==="home"?state.homeTeam:state.awayTeam;
  const w=view.width,h=view.height,t=c.time, floor=h*.72;
  let backdrop = ceremonyBackdrops.get(state);
  if (!backdrop || backdrop.width !== w || backdrop.height !== h) {
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const background = canvas.getContext("2d")!;
    drawStadium(background,view,"balanced"); drawField(background,view,"balanced",state);
    backdrop = { width: w, height: h, canvas }; ceremonyBackdrops.set(state,backdrop);
  }
  ctx.save();ctx.filter="blur(3px)";ctx.drawImage(backdrop.canvas,0,0,w,h);ctx.restore();
  ctx.fillStyle="rgba(4,12,22,.6)";ctx.fillRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w*.5,floor-90,0,w*.5,floor-90,w*.55);
  glow.addColorStop(0,"rgba(216,184,92,.18)");glow.addColorStop(1,"rgba(216,184,92,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#142330";ctx.fillRect(w*.17,floor,w*.66,h*.08);
  ctx.fillStyle=team.primary;ctx.fillRect(w*.17,floor,w*.66,4);
  ctx.fillStyle="#d4dfdf";ctx.font=`600 ${Math.max(10,w*.012)}px Arial`;ctx.textAlign="center";ctx.fillText("STADLER FOOTBALL • CAMPEÕES",w*.5,floor+h*.053);
  const winners=state.players.filter(p=>p.side===c.winner).sort((a,b)=>Number(a.id===c.captainId)-Number(b.id===c.captainId));
  let captainX=w*.5,captainY=floor-5, captainScale=1,lift=0;
  for(const player of winners) {
    const pose=celebrationPose(c,player)!;
    const gather=Math.min(1,t/4.5),origin=project(view,pose.x,pose.y);
    const x=origin.x*(1-gather)+(w*.5+(pose.x-50)*w*.026)*gather;
    const y=origin.y*(1-gather)+(floor-8-(pose.height-.7)*20)*gather;
    const scale=Math.min(w/760,h/440)*(pose.captain?1.1:1);
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle="rgba(0,0,0,.3)";ctx.beginPath();ctx.ellipse(0,2,15,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=team.socks;ctx.lineWidth=7;ctx.lineCap="round";
    const gait=pose.gathered?0:Math.sin(t*9+player.id)*8;
    ctx.beginPath();ctx.moveTo(-6,-22);ctx.lineTo(-7+gait,-3);ctx.moveTo(6,-22);ctx.lineTo(7-gait,-3);ctx.stroke();
    ctx.fillStyle=team.shorts;ctx.fillRect(-12,-32,24,12);
    ctx.fillStyle=player.role==="GK"?"#cbe462":team.primary;ctx.fillRect(-13,-61,26,30);
    ctx.fillStyle=team.secondary;
    if(team.kitPattern==="vertical")for(let i=-11;i<13;i+=8)ctx.fillRect(i,-60,4,27);
    else if(team.kitPattern==="horizontal")for(let i=-60;i<-32;i+=9)ctx.fillRect(-13,i,26,4);
    ctx.strokeStyle="#bd906d";ctx.lineWidth=6;
    const armY=-43-pose.lift*39;
    ctx.beginPath();ctx.moveTo(-14,-56);ctx.lineTo(-23,armY);ctx.moveTo(14,-56);ctx.lineTo(23,armY);ctx.stroke();
    ctx.fillStyle="#c59672";ctx.beginPath();ctx.ellipse(0,-72,9,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#30251f";ctx.beginPath();ctx.ellipse(0,-79,9,5,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 12px Arial";ctx.fillText(String(player.number),0,-42);
    ctx.restore();
    if(pose.captain){captainX=x;captainY=y;captainScale=scale;lift=pose.lift;}
  }
  ctx.save();ctx.translate(captainX,captainY);ctx.scale(captainScale,captainScale);ctx.translate(0,-53-lift*44);
  ctx.shadowColor="#ffe09c";ctx.shadowBlur=14;
  const gold=ctx.createLinearGradient(-20,0,20,0);gold.addColorStop(0,"#977028");gold.addColorStop(.4,"#fff0ad");gold.addColorStop(1,"#be852f");
  ctx.fillStyle=gold;ctx.strokeStyle=gold;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-15,-25);ctx.lineTo(15,-25);ctx.quadraticCurveTo(15,-5,3,-4);ctx.lineTo(3,4);ctx.lineTo(11,8);ctx.lineTo(-11,8);ctx.lineTo(-3,4);ctx.lineTo(-3,-4);ctx.quadraticCurveTo(-15,-5,-15,-25);ctx.fill();
  for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*15,-17,8,9,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
  for(let i=0;i<640;i++){
    const p=celebrationParticle(i,t);if(!p)continue;
    ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(w*.5+(p.x-50)*w*.026,floor+(p.y-32)*h*.006-p.z*h*.033);ctx.rotate(p.rotation);
    ctx.fillStyle=[team.primary,team.secondary,"#f1db91"][i%3];ctx.fillRect(-2,-4,4,8);ctx.restore();
  }
  for(let i=0;i<288;i++){
    const p=fireworkParticle(i,t);if(!p)continue;
    ctx.globalAlpha=p.alpha;ctx.fillStyle=i%2?"#ffd58c":team.secondary;
    ctx.fillRect(p.x/100*w,h*.72-p.z*h*.022,3,3);
  }
  ctx.globalAlpha=1;
  if(t>5)for(let i=0;i<38;i++)if(Math.sin(t*13+i*83)>.985){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc((i*97)%w,h*.22+(i*23)%(h*.22),2.4,0,Math.PI*2);ctx.fill();}
}

const cameraFrames = new WeakMap<MatchState, { frame: CameraFrame; time: number; mode: string }>();

export function drawScene(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
  quality: Quality,
  presentation: PresentationSettings = DEFAULT_PRESENTATION,
) {
  if (state.celebration) { drawTitleCeremony(ctx, view, state); return; }
  if (view.height > view.width * 1.1) {
    const fitted = { ...view, height: view.width * 0.78 };
    ctx.fillStyle = "#101d27"; ctx.fillRect(0, 0, view.width, view.height);
    ctx.save(); ctx.translate(0, (view.height - fitted.height) * 0.46);
    drawScene(ctx, fitted, state, quality, presentation); ctx.restore();
    return;
  }
  const target = cameraTarget(state,presentation.camera,view.width/view.height);
  let tracking = cameraFrames.get(state);
  if(!tracking) { tracking={frame:target,time:state.elapsed,mode:presentation.camera};cameraFrames.set(state,tracking); }
  const frameDt = clamp(state.elapsed-tracking.time,0,.1);tracking.time=state.elapsed;
  tracking.frame=tracking.mode!==presentation.camera?target:stepCamera(tracking.frame,target,frameDt);
  tracking.mode=presentation.camera;
  const zoom=116/tracking.frame.span,focus=project(view,tracking.frame.x,tracking.frame.y);
  ctx.fillStyle=presentation.lighting==="day"?"#526f73":"#091820";ctx.fillRect(0,0,view.width,view.height);
  const shakeScale = clamp(view.height / 720, 0.65, 1.25);
  const shakeX =
    Math.sin(state.elapsed * 93) * state.cameraShake * 5.5 * shakeScale;
  const shakeY =
    Math.cos(state.elapsed * 71) * state.cameraShake * 3.4 * shakeScale;
  ctx.save();
  ctx.translate(shakeX+view.width*.5,shakeY+view.height*.53);
  ctx.scale(zoom,zoom);ctx.translate(-focus.x,-focus.y);
  drawStadium(ctx, view, quality, presentation.lighting);
  drawField(ctx, view, quality, state);
  drawPitchWear(ctx, view, state);
  if(state.training?.kind==='dribble'){
    const gate=TRAINING_GATES[state.training.checkpoint];if(gate){const point=project(view,gate.x,gate.y);ctx.strokeStyle='#b5ff6a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(point.x,point.y,20,12,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ecffdd';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillText(String(state.training.checkpoint+1),point.x,point.y-17);}
  }
  drawDefensiveCue(ctx, view, state, quality);
  if (quality !== "performance") drawBallTrail(ctx, view, state.trail);
  const sortedPlayers = state.players
    .filter((player) => !player.sentOff)
    .sort((a, b) => a.y - b.y);
  sortedPlayers.forEach((player) => {
    const selected =
      player.id === state.selectedId ||
      (state.gameMode === "local2p" && player.id === state.selectedAwayId);
    drawPlayer(
      ctx,
      view,
      player,
      player.side === "home" ? state.homeTeam : state.awayTeam,
      selected,
      quality,
      frameDt,
    );
  });
  drawSetPieceGuide(ctx, view, state);
  drawBall(ctx, view, state.ball);
  drawParticles(ctx, view, state.particles);
  ctx.restore();
  drawMinimap(ctx, view, state);
  if (quality === "ultra") {
    const vignette = ctx.createRadialGradient(
      view.width / 2,
      view.height / 2,
      view.height * 0.3,
      view.width / 2,
      view.height / 2,
      view.width * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.32)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, view.width, view.height);
  }
  if (state.impactFlash > 0) {
    ctx.fillStyle = "rgba(226,248,255," + state.impactFlash * 0.18 + ")";
    ctx.fillRect(0, 0, view.width, view.height);
  }
}
