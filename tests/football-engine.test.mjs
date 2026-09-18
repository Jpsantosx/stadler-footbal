import test from "node:test";
import assert from "node:assert/strict";
import {
  TEAMS,
  ROSTERS,
  FORMATIONS,
  TACTICS,
  createMatch,
  updateMatch,
  updateBall,
  updateHuman,
  finishingTargetY,
  accuratePassTarget,
  resolvePlayerCollisions,
  aiTarget,
  attackProgressAt,
  playerAttributeFactor,
  lineupFor,
} from "../lib/football-engine.ts";
import {
  createCareer,
  createLeagueRows,
  createLeagueSchedule,
  nextLeagueFixture,
  simulateLeagueRound,
  competitionPoolFor,
} from "../lib/football-competition.ts";
import {
  ensureManagement,
  playerKey,
  transferValue,
  weeklyWage,
  negotiateTransfer,
  selectCareerStarter,
  careerMatchSquad,
  advanceCareerRound,
  promoteYouth,
  sellCareerPlayer,
  nextCareerSeason,
} from "../lib/football-career.ts";

const input = () => ({
  keys: new Set(),
  touchX: 0,
  touchY: 0,
  touchSprint: false,
});
const match = () => createMatch(TEAMS[0], TEAMS[1], "normal", true);
const simulate = (s, seconds, demo = true) => {
  for (let i = 0; i < seconds * 120; i++)
    updateMatch(s, input(), 1 / 120, demo);
  return s;
};

test("116 real clubs populate six complete, isolated leagues with unique athletes", () => {
  assert.equal(TEAMS.length, 116);
  assert.equal(new Set(TEAMS.map((t) => t.id)).size, 116);
  const ids = [];
  for (const team of TEAMS) {
    const roster = ROSTERS[team.id];
    assert.ok(roster.length >= 8);
    for (const role of ["GK", "DF", "MF", "FW"])
      assert.ok(
        roster.some((p) => p[3] === role),
        team.id + role,
      );
    ids.push(...roster.map(playerKey));
    assert.ok(
      competitionPoolFor(team, "league", "continental").every(
        (t) => t.leagueId === team.leagueId,
      ),
    );
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length > 3700);
  assert.deepEqual(
    [...new Set(TEAMS.map((t) => t.leagueId))]
      .map((id) => TEAMS.filter((t) => t.leagueId === id).length)
      .sort(),
    [18, 18, 20, 20, 20, 20],
  );
});

test("8-a-side formations preserve natural roles when the squad has coverage", () => {
  for (const formation of Object.values(FORMATIONS)) {
    const lineup = lineupFor(ROSTERS[TEAMS[0].id], formation);
    assert.equal(lineup.length, 8);
    assert.equal(new Set(lineup.map(playerKey)).size, 8);
    lineup.forEach((p, i) => assert.equal(p[3], formation.slots[i][0]));
  }
});

test("reviewed leaders remain ahead of reserves in the starting ratings", () => {
  const madrid = ROSTERS["real-madrid"];
  const rating = (squad, name) => squad.find((p) => p[0].includes(name))[2];
  assert.ok(rating(madrid, "Courtois") >= rating(madrid, "Lunin") + 7);
  assert.ok(rating(madrid, "Mbappé") > rating(madrid, "Brahim"));
  assert.ok(
    rating(ROSTERS.flamengo, "Arrascaeta") > rating(ROSTERS.flamengo, "Saúl"),
  );
  assert.ok(
    Object.values(ROSTERS)
      .flat()
      .every((p) => p[5] >= p[2]),
  );
});

test("elite market values and wages are distinct from ordinary squad players", () => {
  const ordinary = ["Example", 7, 70, "FW", 26, 70, 75, "test"];
  const elite = [...ordinary];
  elite[2] = elite[5] = 90;
  assert.ok(transferValue(elite) > transferValue(ordinary) * 10);
  assert.ok(weeklyWage(90) > weeklyWage(70) * 8);
  assert.ok(transferValue(ordinary) <= 5);
});

test("full match ends after two 55-second halves plus stoppages without invalid state", () => {
  const s = match();
  s.frozen = 0;
  for (let i = 0; i < 180 * 120 && !s.finished; i++)
    updateMatch(s, input(), 1 / 120, false);
  assert.equal(s.finished, true);
  assert.equal(s.half, 2);
  assert.equal(s.remaining, 0);
  assert.ok(s.elapsed >= 110 && s.elapsed < 180);
  assert.ok(
    s.players.every((p) =>
      [p.x, p.y, p.vx, p.vy, p.stamina].every(Number.isFinite),
    ),
  );
});

test("seeded team AI exchanges passes, creates shots and remains deterministic", () => {
  const a = simulate(match(), 110),
    b = simulate(match(), 110);
  assert.ok(a.stats.homePasses + a.stats.awayPasses > 3);
  assert.ok(a.stats.homeShots + a.stats.awayShots >= 2);
  assert.deepEqual(a, b);
});

test("career formation changes keep natural roles and selected starters", () => {
  const career = createCareer(TEAMS[0]);
  for (const id of Object.keys(FORMATIONS)) {
    const squad = careerMatchSquad(career, id);
    squad.forEach((p, i) => assert.equal(p[3], FORMATIONS[id].slots[i][0]));
    assert.equal(new Set(squad.map(playerKey)).size, 8);
  }
});

test("higher OVR improves acceleration and accuracy in controlled comparisons", () => {
  const low = match().players.find((p) => p.role === "FW"),
    high = { ...low };
  Object.assign(low, { overall: 58, pace: 58, passing: 58, shooting: 58 });
  Object.assign(high, { overall: 92, pace: 92, passing: 92, shooting: 92 });
  const keys = { ...input(), keys: new Set(["KeyD"]) };
  updateHuman(low, keys, 0.1, "solo", playerAttributeFactor(low.pace));
  updateHuman(high, keys, 0.1, "solo", playerAttributeFactor(high.pace));
  assert.ok(high.vx > low.vx * 1.3);
  let lowError = 0,
    highError = 0;
  const a = match(),
    b = match();
  for (let i = 0; i < 1000; i++) {
    lowError += Math.abs(accuratePassTarget(a, low, 70, 32).y - 32);
    highError += Math.abs(accuratePassTarget(b, high, 70, 32).y - 32);
  }
  assert.ok(highError < lowError * 0.5);
});

test("shots can miss the goal and pressure affects precision", () => {
  const s = match(),
    p = s.players.find((p) => p.role === "FW");
  Object.assign(p, {
    x: 65,
    y: 32,
    shooting: 55,
    overall: 55,
    vx: 16,
    stamina: 30,
  });
  const shots = Array.from({ length: 200 }, () =>
    finishingTargetY(s, p, 24.8, 8),
  );
  assert.ok(shots.some((y) => y < 24));
  assert.ok(shots.every(Number.isFinite));
});

test("loose ball has no magnetic attraction and goal crossing counts once", () => {
  const s = match(),
    p = s.players.find((p) => p.role !== "GK");
  s.players = [p];
  Object.assign(p, { x: 53.6, y: 32 });
  Object.assign(s.ball, {
    x: 50,
    y: 32,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    owner: null,
  });
  updateBall(s, 0.1, false);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.x, 50);
  s.players = [];
  Object.assign(s.ball, { x: 99.8, y: 32, z: 0.2, vx: 60, vy: 0, vz: 0 });
  updateBall(s, 0.01, false);
  assert.equal(s.homeScore, 1);
  updateBall(s, 0.01, false);
  assert.equal(s.homeScore, 1);
});

test("goalkeeper cannot handle a high ball outside the penalty area", () => {
  const s = match(),
    keeper = s.players.find((p) => p.role === "GK");
  s.players = [keeper];
  Object.assign(keeper, { x: 50, y: 32 });
  Object.assign(s.ball, {
    x: 50,
    y: 32,
    z: 3,
    vx: 0,
    vy: 0,
    vz: 0,
    owner: null,
  });
  updateBall(s, 1 / 120, false);
  assert.equal(s.ball.owner, null);
});

test("body collision conserves momentum and distributes displacement by mass", () => {
  const s = match();
  s.players = s.players.filter((p) => p.role !== "GK").slice(0, 2);
  const [a, b] = s.players;
  Object.assign(a, { x: 50, y: 30, vx: 8, vy: 0, mass: 90 });
  Object.assign(b, { x: 51, y: 30, vx: -5, vy: 0, mass: 60 });
  const momentum = a.vx * a.mass + b.vx * b.mass;
  resolvePlayerCollisions(s);
  assert.ok(Math.abs(a.vx * a.mass + b.vx * b.mass - momentum) < 1e-8);
  assert.ok(50 - a.x < b.x - 51);
});

test("forwards hold their line and attacking tactics raise the team shape", () => {
  const a = match(),
    b = match();
  a.homeTactic = "defensive";
  b.homeTactic = "attacking";
  for (const s of [a, b]) {
    const opponent = s.players.find(
      (p) => p.side === "away" && p.role === "FW",
    );
    opponent.x = 18;
    s.ball.owner = opponent.id;
  }
  const forward = a.players.find((p) => p.side === "home" && p.role === "FW");
  for (let i = 0; i < 900; i++) aiTarget(a, forward, forward, 1 / 120);
  assert.ok(attackProgressAt(a, "home", forward.x) > 40);
  const dfA = a.players.find((p) => p.side === "home" && p.role === "DF"),
    dfB = b.players.find((p) => p.side === "home" && p.role === "DF");
  a.ball.owner = null;
  b.ball.owner = null;
  a.ball.x = b.ball.x = 65;
  for (let i = 0; i < 900; i++) {
    aiTarget(a, dfA, undefined, 1 / 120);
    aiTarget(b, dfB, undefined, 1 / 120);
  }
  assert.ok(dfB.x > dfA.x + 5);
  assert.ok(TACTICS.attacking.line > TACTICS.defensive.line);
});

test("league calendar schedules every opponent home and away exactly once", () => {
  const teams = TEAMS.filter((t) => t.leagueId === "brasileirao"),
    schedule = createLeagueSchedule(teams.map((t) => t.id));
  assert.equal(schedule.length, 38);
  const pairs = new Set();
  for (const round of schedule) {
    assert.equal(new Set(round.flatMap((f) => [f.homeId, f.awayId])).size, 20);
    for (const f of round) {
      const key = f.homeId + ":" + f.awayId;
      assert.ok(!pairs.has(key));
      pairs.add(key);
    }
  }
  assert.equal(pairs.size, 380);
  let rows = createLeagueRows("brasileirao");
  for (let r = 0; r < 38; r++) {
    const f = nextLeagueFixture(rows, teams[0].id);
    const away = f.homeId === teams[0].id ? f.awayId : f.homeId;
    rows = simulateLeagueRound(rows, teams[0].id, away, 2, 1);
  }
  assert.ok(rows.every((r) => r.played === 38));
  assert.equal(nextLeagueFixture(rows, teams[0].id), undefined);
});

test("negotiations debit fee and wages, transfer ownership and enable the signed player", () => {
  let career = ensureManagement(createCareer(TEAMS[0]));
  career = {
    ...career,
    budget: 1000,
    management: { ...career.management, wageLimit: 50000 },
  };
  const seller = TEAMS[1].id,
    seed = career.management.worldSquads[seller].find((p) => p[3] === "FW");
  const offer = {
    sellerId: seller,
    playerId: playerKey(seed),
    fee: transferValue(seed),
    wage: weeklyWage(seed[2]),
    years: 3,
  };
  const result = negotiateTransfer(career, offer);
  assert.equal(result.accepted, true);
  assert.equal(
    result.career.budget,
    Number((1000 - offer.fee - (offer.wage * 4) / 1000).toFixed(3)),
  );
  assert.ok(
    !result.career.management.worldSquads[seller].some(
      (p) => playerKey(p) === offer.playerId,
    ),
  );
  const selected = selectCareerStarter(result.career, offer.playerId),
    squad = careerMatchSquad(selected, "2-3-2");
  assert.ok(squad.some((p) => playerKey(p) === offer.playerId));
  const game = createMatch(
    TEAMS[0],
    TEAMS[1],
    "normal",
    false,
    "solo",
    "2-3-2",
    "2-3-2",
    "balanced",
    "balanced",
    squad,
  );
  assert.ok(
    game.players.some((p) => p.side === "home" && p.squadId === offer.playerId),
  );
  assert.equal(negotiateTransfer(result.career, offer).accepted, false);
  assert.equal(
    negotiateTransfer(career, { ...offer, fee: -1 }).accepted,
    false,
  );
  assert.equal(negotiateTransfer(career, { ...offer, fee: 0 }).accepted, false);
  assert.equal(
    negotiateTransfer({ ...career, budget: 0 }, offer).accepted,
    false,
  );
});

test("career rounds evolve fatigue, morale, payroll and real AI ownership", () => {
  let career = ensureManagement(createCareer(TEAMS[0]));
  const before = JSON.stringify(career.management.worldSquads);
  const game = createMatch(
    TEAMS[0],
    TEAMS[1],
    "normal",
    false,
    "solo",
    "2-3-2",
    "2-3-2",
    "balanced",
    "balanced",
    careerMatchSquad(career, "2-3-2"),
  );
  game.homeScore = 2;
  game.awayScore = 1;
  game.players
    .filter((p) => p.side === "home")
    .forEach((p) => (p.stamina = 20));
  const starter = game.players[0].squadId;
  for (let i = 0; i < 5; i++)
    career = ensureManagement(advanceCareerRound(career, game));
  assert.equal(career.management.week, 5);
  assert.equal(career.management.points, 15);
  assert.ok(career.management.contracts[starter].fatigue > 0);
  assert.notEqual(JSON.stringify(career.management.worldSquads), before);
  const all = [
    ...career.squad,
    ...Object.values(career.management.worldSquads).flat(),
  ].map(playerKey);
  assert.equal(new Set(all).size, all.length);
  assert.ok(Object.values(career.management.worldBudgets).every((v) => v >= 0));
});

test("academy promotion and sale update squad, board and finance atomically", () => {
  const career = ensureManagement(createCareer(TEAMS[0])),
    youth = career.management.academy[0];
  const next = ensureManagement(promoteYouth(career, playerKey(youth)));
  assert.equal(next.squad.length, career.squad.length + 1);
  assert.equal(next.management.promoted, 1);
  assert.ok(
    !next.management.academy.some((p) => playerKey(p) === playerKey(youth)),
  );
  const player = next.squad.find((p) => p[3] === "FW");
  const sale = sellCareerPlayer(next, playerKey(player));
  assert.ok(sale.career.budget > next.budget);
  assert.ok(!sale.career.squad.some((p) => playerKey(p) === playerKey(player)));
});

test("board can dismiss the manager and season transition ages contracts", () => {
  let career = ensureManagement(createCareer(TEAMS[0]));
  career.management = { ...career.management, confidence: 13, week: 10 };
  const game = match();
  game.homeScore = 0;
  game.awayScore = 3;
  assert.equal(advanceCareerRound(career, game).management.status, "sacked");
  career = ensureManagement(createCareer(TEAMS[0]));
  career.management.week = 38;
  career.management.points = 90;
  career.management.promoted = 2;
  const id = playerKey(career.squad[0]),
    age = career.management.contracts[id].age;
  const next = nextCareerSeason(career);
  assert.equal(next.season, 2);
  assert.equal(next.management.week, 0);
  assert.equal(next.management.contracts[id].age, age + 1);
});

// Defensive regression suite: contact must be reachable outside the body collision radius.
const defense = await import("../lib/football-engine.ts");
const presentation = await import("../lib/football-presentation.ts");
const pitchModule = await import("../lib/football-pitch.ts");
const touch = await import("../lib/football-input.ts");
function duel() {
  const s = match(); s.frozen = 0; s.setPiece = null;
  const owner = s.players.find(p => p.side === "home" && p.role === "FW");
  const bot = s.players.find(p => p.side === "away" && p.role === "DF");
  Object.assign(owner,{x:70,y:32,facingX:1,facingY:0,vx:0,vy:0,controlShield:0});
  Object.assign(bot,{x:72,y:32,facingX:-1,facingY:0,vx:0,vy:0,defending:85});
  Object.assign(s.ball,{owner:owner.id,x:71.2,y:32,z:.1,vx:0,vy:0});
  s.selectedId=owner.id;
  return {s,owner,bot};
}

test("a bot initiates a real lunge outside body overlap and wins clean ball contact",()=>{
  const {s,owner,bot}=duel();
  s.players = [owner,bot];
  defense.updateSteals(s,.22,false);
  assert.equal(bot.defensiveState,"tackle");
  assert.ok(bot.stealTimer>0);
  assert.equal(s.ball.owner,owner.id,"starting an animation must not steal the ball remotely");
  defense.resolveStealAttempts(s,false);
  assert.equal(s.ball.owner,bot.id);
  assert.equal(s.ball.lastPlayerId,bot.id);
  assert.equal(s.stats.awayFouls,0);
  assert.equal(s.ball.vx,0);
});

test("rear body contact is a foul even for an elite defender; missing the ball gives no possession",()=>{
  for(const sliding of [false,true]){
    const {s,owner,bot}=duel();
    Object.assign(bot,{x:68.4,defending:99,facingX:1});
    assert.equal(defense.tackleContact(s,bot,sliding),"foul");
    defense.beginTackle(s,bot,sliding);
    if(sliding)defense.resolveSlideTackles(s,false);else defense.resolveStealAttempts(s,false);
    assert.equal(s.stats.awayFouls,1);
    assert.ok(s.setPiece);
    assert.notEqual(s.ball.owner,bot.id);
    assert.equal(s.setPiece.side,owner.side);
  }
  const {s,bot}=duel();s.ball.y=38;
  assert.equal(defense.tackleContact(s,bot,false),"none");
});

test("holding or circling recruits a second defender and a pass clears the pressure history",()=>{
  for(const circle of [false,true]){
    const {s,owner}=duel();
    for(let i=0;i<190;i++){
      if(circle){owner.x=70+3*Math.cos(i/60*Math.PI*2/1.2);owner.y=32+3*Math.sin(i/60*Math.PI*2/1.2);}
      defense.updateDefensivePressure(s,1/60,false);
    }
    assert.ok(s.pressure.stagnant>=1.2);
    const first=defense.pressingPlayer(s,"away");
    assert.notEqual(s.pressure.secondaryId,null);
    assert.notEqual(s.pressure.secondaryId,first.id);
    const support=s.players.find(p=>p.id===s.pressure.secondaryId);
    assert.notEqual(support.role,"GK");
    const teammate=s.players.find(p=>p.side==="home"&&p.id!==owner.id&&p.role!=="GK");
    s.ball.owner=teammate.id;s.selectedId=teammate.id;
    defense.updateDefensivePressure(s,1/60,false);
    assert.equal(s.pressure.secondaryId,null);
    assert.equal(s.pressure.held,0);
  }
});

test("stationary human possession is challenged in a real match update",()=>{
  const {s,owner}=duel();
  let contested=false;
  for(let i=0;i<3*120;i++){
    updateMatch(s,input(),1/120,false);
    if(s.ball.owner!==owner.id||s.setPiece){contested=true;break;}
  }
  assert.ok(contested,"defenders may not orbit a stationary carrier indefinitely");
});

test("keepers close the angle before a shot and react only after recognition delay",()=>{
  const s=match();s.frozen=0;
  const keeper=s.players.find(p=>p.side==="home"&&p.role==="GK");
  const attacker=s.players.find(p=>p.side==="away"&&p.role==="FW");
  Object.assign(attacker,{x:15,y:37,vx:-6,vy:4});s.ball.owner=attacker.id;
  const close=defense.keeperAngleTarget(s,keeper);
  attacker.x=60;const far=defense.keeperAngleTarget(s,keeper);
  assert.ok(close.x>far.x&&close.y>32);
  Object.assign(attacker,{x:15,y:32,vx:0,vy:0});Object.assign(keeper,{x:4.8,y:32,vx:0,vy:0});
  defense.kickBall(s,attacker,0,32,35,"shot",13);
  const delay=keeper.keeperReactionTimer;
  assert.ok(delay>=.105&&delay<=.26);
  defense.updateKeeper(s,keeper,delay*.5);
  assert.equal(keeper.keeperDiveTimer,0);
  assert.equal(keeper.keeperSave,"set");
  defense.updateKeeper(s,keeper,delay);
  assert.equal(keeper.keeperSave,"tip");
  assert.ok(keeper.keeperDiveTimer>0);
});

test("a close one-on-one triggers smothering inside the penalty area",()=>{
  const s=match();const keeper=s.players.find(p=>p.side==="away"&&p.role==="GK");
  const owner=s.players.find(p=>p.side==="home"&&p.role==="FW");
  Object.assign(keeper,{x:94,y:32,facingX:-1,keeperReactionTimer:0});Object.assign(owner,{x:92,y:32});
  Object.assign(s.ball,{owner:owner.id,x:93,y:32});
  defense.resolveKeeperSmothers(s);
  assert.equal(keeper.keeperSave,"smother");
  assert.ok(keeper.keeperDiveTimer>0);
  assert.notEqual(s.ball.owner,owner.id);
});

test("only the cup final celebrates, including an away winner, and match clocks freeze",()=>{
  for(const round of [null,0,1,2]){
    const s=match();s.cupRound=round;s.homeScore=0;s.awayScore=2;
    defense.finishMatch(s);
    assert.equal(!!s.celebration,round===2);
    if(round!==2)continue;
    assert.equal(s.celebration.winner,"away");
    const original=structuredClone({elapsed:s.elapsed,remaining:s.remaining,players:s.players,stats:s.stats});
    const captain=s.players.find(p=>p.id===s.celebration.captainId);
    for(let i=0;i<180;i++){updateMatch(s,input(),.1,false);presentation.updateTitleCelebration(s,.1);}
    assert.deepEqual({elapsed:s.elapsed,remaining:s.remaining,players:s.players,stats:s.stats},original);
    assert.equal(s.celebration.complete,true);
    assert.equal(presentation.celebrationPose(s.celebration,captain).lift,1);
    const ref=s.celebration;defense.finishMatch(s);assert.equal(s.celebration,ref);
  }
});

test("cup ties use recorded penalty kicks, independently of possession",()=>{
  const a=match(),b=match();a.cupRound=b.cupRound=2;
  a.stats.homePossession=100;b.stats.awayPossession=100;
  defense.finishMatch(a);defense.finishMatch(b);
  assert.deepEqual(a.shootout,b.shootout);
  assert.ok(a.shootout.kicks.length>=6);
  assert.notEqual(a.shootout.home,a.shootout.away);
  assert.equal(a.winner,b.winner);
  assert.equal(a.celebration.winner,a.winner);
});

test("grass wear accumulates at traffic positions, slides leave persistent scuffs and a new match resets them",()=>{
  const s=match(),p=s.players[1];Object.assign(p,{x:50,y:32,vx:8,vy:0,slideTimer:.4});
  pitchModule.updatePitchWear(s.pitchWear,[p],.2);
  assert.equal(s.pitchWear.marks.length,1);
  const index=16*50+25;
  assert.ok(s.pitchWear.cells[index]>0);
  assert.equal(s.pitchWear.cells[0],0);
  p.slideTimer=0;pitchModule.updatePitchWear(s.pitchWear,[p],.2);
  assert.equal(s.pitchWear.marks.length,1);
  assert.equal(match().pitchWear.cells[index],0);
});

test("mobile joystick has a dead zone, bounded diagonal speed and reset cancels a held shot",()=>{
  const rect={left:10,top:20,width:104,height:104};
  assert.deepEqual(touch.joystickVector(62,72,rect),{x:0,y:0});
  const diagonal=touch.joystickVector(300,300,rect);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);
  const keys=input(),s=match();keys.touchX=1;keys.touchSprint=true;keys.keys.add("KeyD");s.chargingShot=true;s.shotCharge=.8;
  touch.clearMatchInput(keys,s);
  assert.equal(keys.touchX,0);assert.equal(keys.keys.size,0);assert.equal(keys.touchSprint,false);
  assert.equal(s.chargingShot,false);assert.equal(s.shotCharge,0);
});

test("a keeper holding the ball inside the box cannot be cleanly tackled through his hands",()=>{
  const {s,bot}=duel();
  const keeper=s.players.find(p=>p.side==="home"&&p.role==="GK");
  Object.assign(keeper,{x:6,y:32}); Object.assign(bot,{x:7.5,y:32,facingX:-1});
  Object.assign(s.ball,{owner:keeper.id,x:7,y:32,z:.7});
  assert.equal(defense.tackleContact(s,bot,false),"foul");
  assert.equal(defense.tackleContact(s,bot,true),"foul");
});

test("ceremony clock handles slow rendered frames independently of the physics timestep",()=>{
  const s=match();s.cupRound=2;s.homeScore=1;defense.finishMatch(s);
  for(let i=0;i<34;i++)presentation.updateTitleCelebration(s,.5);
  assert.equal(s.celebration.time,17);assert.equal(s.celebration.complete,true);
  assert.equal(s.elapsed,0);
});
