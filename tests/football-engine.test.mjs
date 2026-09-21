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
    Object.assign(bot,{x:68.9,defending:99,facingX:1});
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

import { PerspectiveCamera, Vector3 } from "three";
import { cameraTarget, stepCamera, broadcastCameraPose, parsePresentation } from "../lib/football-camera.ts";
import { createFramePresenter } from "../lib/football-frame.ts";
import { athletePose, createLocomotion } from "../lib/football-animation.ts";
import { chooseDirectionalPassTarget, passToPlayer, movementIntent, applyMovementVelocity, faceDirection } from "../lib/football-engine.ts";

function projectCamera(frame, aspect, point) {
  const pose = broadcastCameraPose(frame, aspect);
  const camera = new PerspectiveCamera(pose.fov, aspect, .1, 400);
  camera.position.set(pose.x, pose.height, pose.z);
  camera.lookAt(pose.lookX, 0, pose.lookY); camera.updateMatrixWorld();
  return new Vector3(point.x, 0, point.y).project(camera);
}

test("broadcast framing keeps the ball visible at touchlines and goal lines", () => {
  const s=match();s.ball.vx=s.ball.vy=0;
  for(const mode of ["broadcast","close","tactical"]) for(const aspect of [390/564,844/390,16/9]) for(const x of [1,50,99]) for(const y of [1,32,63]) {
    s.ball.x=x;s.ball.y=y;
    const projected=projectCamera(cameraTarget(s,mode,aspect),aspect,s.ball);
    assert.ok(Math.abs(projected.x)<.96 && Math.abs(projected.y)<.96,JSON.stringify({mode,aspect,x,y,px:projected.x,py:projected.y}));
  }
});

test("local multiplayer camera widens to retain both selected players", () => {
  const s=match();s.gameMode="local2p";
  const a=s.players.find(p=>p.id===s.selectedId), b=s.players.find(p=>p.id===s.selectedAwayId);
  a.x=7;a.y=9;b.x=92;b.y=55;s.ball.x=80;s.ball.y=45;
  for(const aspect of [1.3,16/9,2.16]) {
    const frame=cameraTarget(s,"close",aspect);
    for(const p of [a,b,s.ball]) {
      const projected=projectCamera(frame,aspect,p);
      assert.ok(Math.abs(projected.x)<.97 && Math.abs(projected.y)<.97);
    }
  }
});

test("camera smoothing has the same response at 30 and 120 frames per second", () => {
  const start={x:50,y:32,span:78},target={x:75,y:20,span:100};
  const run=hz=>{let c={...start};for(let i=0;i<hz;i++)c=stepCamera(c,target,1/hz);return c;};
  const a=run(30),b=run(120);for(const key of ["x","y","span"])assert.ok(Math.abs(a[key]-b[key])<1e-8);
  assert.deepEqual(parsePresentation({camera:"bad",lighting:"bad"}),{camera:"broadcast",lighting:"night",automatic:true,radar:true});
});

test("render interpolation never moves the simulation and snaps after restarts", () => {
  const s=match();s.frozen=0;
  const presenter=createFramePresenter(), p=s.players[2],x=p.x;
  presenter.capture(s);p.x+=.2;s.ball.x+=.1;
  const visual=presenter.sample(s,.5);
  assert.ok(Math.abs(visual.players[2].x-x-.1)<1e-8);
  assert.ok(Math.abs(p.x-x-.2)<1e-8);assert.notEqual(visual.players[2],p);
  assert.equal(presenter.sample(s,.8),visual,"presentation identity must remain stable for renderer caches");
  p.x=95;s.homeScore++;assert.equal(presenter.sample(s,.1).players[2].x,95);
  const next=match();assert.notEqual(presenter.sample(next,1),visual);
});

test("directed passes honor a backward input and exclude offside receivers", () => {
  const s=match();const passer=s.players.find(p=>p.side==="home"&&p.role==="MF");
  const mates=s.players.filter(p=>p.side==="home"&&p.id!==passer.id);
  passer.x=50;passer.y=32;passer.facingX=1;passer.facingY=0;
  mates.forEach((p,i)=>{p.x=60+i;p.y=12;});
  const back=mates[0];back.x=30;back.y=32;
  const forward=mates[1];forward.x=65;forward.y=32;
  s.players.filter(p=>p.side==="away").forEach((p,i)=>{p.x=85+i*.5;p.y=10+i*6;});
  assert.equal(chooseDirectionalPassTarget(s,passer,{x:-1,y:0}).id,back.id);
  assert.equal(chooseDirectionalPassTarget(s,passer,{x:1,y:0}).id,forward.id);
  forward.x=99;
  assert.notEqual(chooseDirectionalPassTarget(s,passer,{x:1,y:0})?.id,forward.id);
});

test("through passes lead a runner farther and retain a receiving intention", () => {
  const s=match();const passer=s.players.find(p=>p.side==="home"&&p.role==="MF");
  const receiver=s.players.find(p=>p.side==="home"&&p.role==="FW");
  passer.x=35;passer.y=32;receiver.x=55;receiver.y=32;receiver.vx=8;receiver.vy=0;
  s.players.filter(p=>p.side==="away").forEach(p=>p.x=90);
  const rng=s.rng;passToPlayer(s,passer,receiver);const normal=s.passIntent.x;
  s.rng=rng;passToPlayer(s,passer,receiver,true);
  assert.ok(s.passIntent.x>normal+3);assert.equal(s.passIntent.receiverId,receiver.id);
  assert.equal(s.ball.owner,null);
});

test("movement conserves momentum on reversal and responds to mass and OVR", () => {
  const base=match().players[2];const light={...base,mass:65,overall:92,pace:92,vx:0,vy:0};
  const heavy={...base,mass:94,overall:65,pace:65,vx:0,vy:0};
  for(let i=0;i<12;i++){applyMovementVelocity(light,22,0,1/120);applyMovementVelocity(heavy,22,0,1/120);}
  assert.ok(light.vx>heavy.vx*1.3);
  light.vx=20;applyMovementVelocity(light,-20,0,1/120);assert.ok(light.vx>18);
  const before=Math.atan2(light.facingY,light.facingX);
  faceDirection(light,-light.facingX,-light.facingY,1/120);
  assert.ok(Math.abs(Math.atan2(Math.sin(Math.atan2(light.facingY,light.facingX)-before),Math.cos(Math.atan2(light.facingY,light.facingX)-before)))<.2);
});

test("touch and keyboard use the same bounded aiming direction in local two player", () => {
  const i=input();i.touchX=.8;i.touchY=.8;i.keys.add("ArrowLeft");
  const home=movementIntent(i,"home","local2p"),away=movementIntent(i,"away","local2p");
  assert.ok(Math.abs(Math.hypot(home.x,home.y)-1)<1e-8);assert.equal(away.x,-1);assert.equal(away.y,0);
});

test("athlete poses blend stride and distinct pass/shot recovery without invalid angles", () => {
  const p={...match().players[2]}, m=createLocomotion(p);
  p.vx=18;p.vy=0;for(let i=0;i<60;i++)athletePose(p,m,1/60);
  p.action="shot";p.actionTimer=.25;const shot=athletePose(p,m,1/60);
  p.action="pass";p.actionTimer=.17;const pass=athletePose(p,m,1/60);
  assert.ok(shot.kick>pass.kick);
  for(const n of [...shot.stride,...shot.knees,...shot.elbows,shot.lean,shot.bank])assert.ok(Number.isFinite(n));
  p.actionTimer=0;p.vx=p.vy=0;let idle;for(let i=0;i<240;i++)idle=athletePose(p,m,1/60);
  assert.ok(Math.abs(idle.stride[0])<.001);
});

test("broadcast camera follows a fast shot without losing the ball", () => {
  const s=match();s.ball.owner=null;s.ball.x=50;s.ball.y=40;s.ball.vx=75;s.ball.vy=0;
  const aspect=844/390;let frame=cameraTarget(s,"broadcast",aspect);
  for(let tick=0;tick<40;tick++) {
    s.ball.x=Math.min(100,s.ball.x+s.ball.vx/60);
    frame=stepCamera(frame,cameraTarget(s,"broadcast",aspect),1/60);
    const p=projectCamera(frame,aspect,s.ball);
    assert.ok(Math.abs(p.x)<.98 && Math.abs(p.y)<.98);
  }
});

import { createGamepadDriver, padFamily, padButtonLabel, padStick, STANDARD_PAD, PAD_ACTIONS, parsePadProfiles, beginPadCalibration, advancePadCalibration } from "../lib/football-gamepad.ts";

const mockPad=(index=0,id="Xbox Wireless Controller")=>({index,id,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
const padButton=(pad,index,pressed)=>{pad.buttons[index]={pressed,value:pressed?1:0};};

test("controller prompts follow standard physical layout for Xbox, Sony and Nintendo",()=>{
  assert.equal(padFamily("Wireless Controller (Vendor: 054c Product: 09cc)"),"playstation");
  assert.equal(padFamily("Nintendo Switch Pro Controller (057e)"),"nintendo");
  assert.equal(padFamily("Xbox Wireless Controller"),"xbox");
  assert.equal(padFamily("USB controller"),"generic");
  assert.equal(padButtonLabel("xbox","pass"),"A");assert.equal(padButtonLabel("playstation","shoot"),"○");
  assert.equal(padButtonLabel("nintendo","pass"),"B");assert.equal(padButtonLabel("nintendo","sprint"),"ZR");
});

test("analog dead zone rejects drift but preserves proportional diagonal movement",()=>{
  assert.deepEqual(padStick(.1,-.09),{x:0,y:0});assert.deepEqual(padStick(NaN,1),{x:0,y:0});
  const walk=padStick(.5,0),run=padStick(1,0),diagonal=padStick(1,1);
  assert.ok(walk.x>0 && walk.x<run.x/2);assert.equal(run.x,1);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);
});

test("new controllers wait for neutral and charge shots only on deliberate edges",()=>{
  const driver=createGamepadDriver(),p=mockPad();padButton(p,1,true);
  const poll=()=>driver.poll([p],"solo","playing",0);
  assert.deepEqual(poll().events,[]);padButton(p,1,false);assert.deepEqual(poll().events,[]);
  padButton(p,1,true);assert.deepEqual(poll().events,[{side:"home",action:"shootStart"}]);
  assert.deepEqual(poll().events,[]);padButton(p,1,false);assert.deepEqual(poll().events,[{side:"home",action:"shootRelease"}]);
  padButton(p,0,true);assert.equal(poll().events[0].action,"pass");assert.equal(poll().events.length,0);
});

test("pause, menu changes and focus loss cancel held input without phantom shot releases",()=>{
  const driver=createGamepadDriver(),p=mockPad();const poll=context=>driver.poll([p],"solo",context,0);
  poll("playing");padButton(p,1,true);assert.equal(poll("playing").events[0].action,"shootStart");
  driver.reset();assert.equal(poll("menu").events.length,0);
  padButton(p,1,false);assert.equal(poll("menu").events.length,0);
  padButton(p,0,true);assert.equal(poll("menu").events[0].action,"confirm");
  assert.equal(poll("playing").events.length,0);padButton(p,0,false);poll("playing");
  p.axes[0]=1;assert.equal(poll("playing").inputs.home.x,1);
  assert.equal(poll("blocked").inputs.home.x,0);assert.equal(poll("playing").inputs.home.x,0);
  p.axes[0]=0;poll("playing");p.axes[0]=1;assert.equal(poll("playing").inputs.home.x,1);
});

test("two controllers keep independent seats across disconnect and index reuse",()=>{
  const driver=createGamepadDriver(),home=mockPad(3),away=mockPad(8,"DualSense Wireless Controller");
  driver.poll([null,home,away],"local2p","playing",0);
  home.axes[0]=1;away.axes[1]=-1;padButton(away,7,true);
  let frame=driver.poll([home,away],"local2p","playing",10);
  assert.equal(frame.inputs.home.x,1);assert.equal(frame.inputs.away.y,-1);assert.equal(frame.inputs.away.sprint,true);
  frame=driver.poll([away],"local2p","playing",20);
  assert.deepEqual(frame.disconnected,["home"]);assert.equal(frame.infos[0].side,"away");assert.equal(frame.inputs.home.x,0);
  const replacement=mockPad(3,"Nintendo Pro Controller");
  frame=driver.poll([away,replacement],"local2p","playing",30);
  assert.equal(frame.infos.find(i=>i.id===replacement.id).side,"home");
  frame=driver.poll([mockPad(8,"Different controller"),replacement],"local2p","playing",40);
  assert.deepEqual(frame.disconnected,["away"]);assert.equal(frame.inputs.away.y,0);
});

test("solo mode ignores the second controller's movement and match actions",()=>{
  const driver=createGamepadDriver(),a=mockPad(),b=mockPad(1);
  driver.poll([a,b],"solo","playing",0);b.axes[0]=1;padButton(b,0,true);
  const frame=driver.poll([a,b],"solo","playing",16);
  assert.equal(frame.inputs.away.x,0);assert.deepEqual(frame.events,[]);
});

test("menu directional repeat is time based and never sends match passes",()=>{
  const driver=createGamepadDriver(),p=mockPad();driver.poll([p],"solo","menu",0);
  padButton(p,13,true);const poll=now=>driver.poll([p],"solo","menu",now);
  assert.equal(poll(0).events[0].action,"down");assert.equal(poll(250).events.length,0);
  assert.equal(poll(400).events[0].action,"down");assert.equal(poll(559).events.length,0);
  assert.equal(poll(560).events[0].action,"down");padButton(p,13,false);padButton(p,0,true);
  assert.deepEqual(poll(600).events,[{side:"home",action:"confirm"}]);
});

test("nonstandard devices require validated mappings and obey custom axes and buttons",()=>{
  const driver=createGamepadDriver(),p=mockPad();p.mapping="";
  assert.equal(driver.poll([p],"solo","playing",0).infos[0].usable,false);
  const profile={...STANDARD_PAD,axisX:2,axisY:3,invertX:true,buttons:{...STANDARD_PAD.buttons,pass:2,slide:0}};
  const profiles=parsePadProfiles({[p.id]:profile,bad:{axisX:0,axisY:0},duplicate:{...profile,buttons:{...profile.buttons,pass:1}},invalid:{...profile,axisX:Infinity}});
  assert.deepEqual(Object.keys(profiles),[p.id]);driver.poll([p],"solo","playing",1,profiles);
  p.axes[2]=-1;padButton(p,2,true);const frame=driver.poll([p],"solo","playing",2,profiles);
  assert.equal(frame.inputs.home.x,1);assert.deepEqual(frame.events,[{side:"home",action:"pass"}]);
  assert.equal(frame.infos[0].custom,true);assert.equal(frame.infos[0].usable,true);
});

test("controller calibration tolerates idle trigger axes and rejects duplicate buttons",()=>{
  const p=mockPad();p.mapping="";p.axes=[0,0,0,-1];
  let c=beginPadCalibration({index:0,id:p.id,side:"home",family:"xbox",usable:false,custom:false});
  const sample=()=>{c=advancePadCalibration(c,p);};
  sample();sample();p.axes[0]=1;sample();assert.equal(c.step,1);
  p.axes[0]=0;sample();p.axes[1]=1;sample();assert.equal(c.step,2);
  p.axes[1]=0;sample();
  const buttons=[2,1,3,0,6,4,7,9];
  for(let i=0;i<buttons.length;i++) {
    if(i===1) {padButton(p,2,true);sample();assert.equal(c.step,3);assert.ok(c.error.length);padButton(p,2,false);sample();}
    padButton(p,buttons[i],true);sample();padButton(p,buttons[i],false);sample();
  }
  assert.equal(c.step,10);assert.equal(c.profile.axisX,0);assert.equal(c.profile.axisY,1);
  PAD_ACTIONS.forEach((action,i)=>assert.equal(c.profile.buttons[action],buttons[i]));
  assert.equal(Object.keys(parsePadProfiles({[p.id]:c.profile})).length,1);
});

test("gamepad analog input drives both athletes, sprint fatigue and set-piece aim",()=>{
  const s=match(),i=input();s.gameMode="local2p";
  const home=s.players.find(p=>p.id===s.selectedId),away=s.players.find(p=>p.id===s.selectedAwayId);
  i.controllers={home:{x:.5,y:0,sprint:false},away:{x:0,y:-1,sprint:true}};
  const homeStart=home.x,awayStart=away.y;
  for(let n=0;n<60;n++){updateHuman(home,i,1/120,"local2p",1);updateHuman(away,i,1/120,"local2p",1);}
  assert.ok(home.x>homeStart);assert.ok(away.y<awayStart);assert.ok(away.stamina<99);assert.ok(home.stamina>=99);
  assert.ok(Math.abs(away.vy)>Math.abs(home.vx)*2);
  defense.startSetPiece(s,"penalty","away",90,32);Object.assign(s.setPiece,{ready:true,timer:0,readyTimer:0});
  defense.updateSetPiece(s,i,.1,false);const aim=s.penaltyDuel.aim;updateMatch(s,i,.1,false);assert.ok(s.penaltyDuel.aim<aim);
  s.chargingShot=true;s.shotCharge=.5;touch.clearMatchInput(i,s);
  assert.deepEqual(i.controllers,{});assert.equal(s.chargingShot,false);assert.equal(s.shotCharge,0);
});

import { createRenderBudget } from '../lib/football-performance.ts';

test('render budget degrades sustained slow frames and recovers gradually without changing requested quality', () => {
  const budget = createRenderBudget();
  let result;
  for (let n=0;n<300;n++) result = budget.sample(1/25, 'ultra', true, true);
  assert.ok(result.scale >= .65 && result.scale < .85);
  assert.equal(result.quality, 'performance');
  const low = result.scale;
  for (let n=0;n<120;n++) result = budget.sample(1/60, 'ultra', true, true);
  assert.equal(result.scale, low, 'brief frame-rate recovery must not oscillate quality');
  for (let n=0;n<2200;n++) result = budget.sample(1/60, 'ultra', true, true);
  assert.equal(result.scale, 1);
  assert.equal(result.quality, 'ultra');
  assert.deepEqual(budget.sample(1/25, 'balanced', false, true), {scale:1,quality:'balanced'});
  assert.deepEqual(budget.sample(1/25, 'high', false, true), {scale:1,quality:'high'});
});

test('hidden/paused and isolated stalled frames never lower the render budget', () => {
  const budget = createRenderBudget();
  for (let n=0;n<300;n++) budget.sample(.1, 'ultra', true, false);
  assert.deepEqual(budget.sample(2, 'ultra', true, true), {scale:1,quality:'ultra'});
  assert.deepEqual(parsePresentation({camera:'close',lighting:'day',automatic:false,radar:false}),
    {camera:'close',lighting:'day',automatic:false,radar:false});
  assert.deepEqual(parsePresentation({camera:'broadcast',lighting:'sunset',automatic:true,radar:true}),
    {camera:'broadcast',lighting:'sunset',automatic:true,radar:true});
});

import { firstTouchDistance, shotBalance, performSkill, releaseShot, supportPosition, registerGoal } from '../lib/football-engine.ts';
import { createGoalReplay } from '../lib/football-replay.ts';
import { parseControls, rumble, shotModifiers } from '../lib/football-controls.ts';

test('first touch responds to incoming speed, movement and technique',()=>{
 assert.ok(firstTouchDistance(32,60,15)>firstTouchDistance(10,60,0));
 assert.ok(firstTouchDistance(32,60,15)>firstTouchDistance(32,95,15));
 assert.ok(firstTouchDistance(300,30,30)<=1.5);
});
test('protection slows the carrier and positions ball away from nearest rival without immunity',()=>{
 const s=match(),i=input(),p=s.players.find(p=>p.id===s.selectedId),q=s.players.find(q=>q.side!==p.side&&q.role!=='GK');
 s.frozen=0;p.x=50;p.y=32;p.facingX=1;p.facingY=0;s.ball.owner=p.id;s.ball.x=50;s.ball.y=32;
 q.x=49;q.y=32;for(const rival of s.players.filter(other=>other.side!==p.side&&other.id!==q.id))rival.x=10;
 i.keys.add('KeyH');i.keys.add('KeyD');updateHuman(p,i,.1,'solo',1);updateBall(s,.1,false);
 assert.equal(p.shielding,true);assert.ok(p.vx<8);assert.ok(s.ball.x>p.x);
 assert.equal(p.controlShield<=1,true);
});
test('rainbow releases an airborne ball, consumes energy and blocks repeat skills',()=>{
 const s=match(),p=s.players.find(p=>p.id===s.selectedId);s.frozen=0;s.ball.owner=p.id;
 const before=p.stamina;assert.equal(performSkill(s,'home','rainbow'),true);
 assert.equal(s.ball.owner,null);assert.ok(s.ball.vz>8);assert.ok(p.stamina<before);
 s.ball.owner=p.id;assert.equal(performSkill(s,'home','rainbow'),false);
});
test('bicycle requires nearby airborne loose ball and cannot create shots while paused',()=>{
 const s=match(),p=s.players.find(p=>p.id===s.selectedId);s.frozen=0;
 assert.equal(performSkill(s,'home','bicycle'),false);
 Object.assign(s.ball,{owner:null,x:p.x+1,y:p.y,z:2.3});s.paused=true;
 assert.equal(performSkill(s,'home','bicycle'),false);s.paused=false;
 assert.equal(performSkill(s,'home','bicycle'),true);assert.equal(p.action,'bicycle');assert.equal(s.lastShotStyle,'BICICLETA');assert.ok(s.ball.z>1);
});
test('lob, placed and power shots have distinct flight and power respects energy and charge',()=>{
 const shoot=(kind,charge=.9,energy=100)=>{const s=match(),p=s.players.find(p=>p.id===s.selectedId);s.ball.owner=p.id;p.x=76;p.y=32;p.vx=p.vy=0;p.stamina=energy;s.shotCharge=charge;s.chargingShot=true;releaseShot(s,'home',kind);return s;};
 const lob=shoot('lob'),placed=shoot('placed'),power=shoot('power');
 assert.ok(lob.ball.vz>placed.ball.vz*2);assert.ok(Math.hypot(power.ball.vx,power.ball.vy)>Math.hypot(placed.ball.vx,placed.ball.vy));
 assert.equal(power.lastShotStyle,'SUPERCHUTE');assert.notEqual(shoot('power',.2).lastShotStyle,'SUPERCHUTE');assert.notEqual(shoot('power',.9,10).lastShotStyle,'SUPERCHUTE');
 const p=match().players[2];p.vx=0;p.vy=0;p.stamina=100;const good=shotBalance(p);p.vx=20;p.vy=20;p.stamina=15;assert.ok(shotBalance(p)<good);
});
test('collective support avoids blocked central lane and stays within role boundaries',()=>{
 const s=match(),p=s.players.find(p=>p.side==='home'&&p.role==='MF'),owner=s.players.find(p=>p.side==='home'&&p.role==='FW');
 owner.x=45;owner.y=32;p.x=60;p.y=32;s.ball.owner=owner.id;
 for(const q of s.players.filter(q=>q.side==='away')){q.x=52;q.y=32;}
 const target=supportPosition(s,p,owner,57,32,{min:30,max:72});
 assert.ok(target.progress>=30&&target.progress<=72);assert.notEqual(target.y,32);
});
test('gamepad combo emits a skill instead of a normal pass and resets safely',()=>{
 const d=createGamepadDriver(),p=mockPad();d.poll([p],'solo','playing',0);
 padButton(p,6,true);d.poll([p],'solo','playing',16);padButton(p,0,true);
 const frame=d.poll([p],'solo','playing',32);assert.equal(frame.inputs.home.shield,true);assert.deepEqual(frame.events,[{side:'home',action:'rainbow'}]);
 d.reset();padButton(p,0,false);assert.deepEqual(d.poll([p],'solo','playing',48).events,[]);
 assert.ok(padStick(.5,0,1.8).x>padStick(.5,0,.5).x);assert.deepEqual(padStick(.1,0,1.8),{x:0,y:0});
 assert.equal(shotModifiers(true,true),'power');assert.equal(shotModifiers(false,true),'lob');
});
test('goal replay is bounded, preserves the goal frame and never changes the live score or clock',()=>{
 const s=match(),r=createGoalReplay();s.frozen=0;
 for(let n=0;n<240;n++){s.elapsed=n/30;s.ball.x=n/3;r.record(s,1/30);}
 assert.equal(r.count,120);s.ball.x=101;registerGoal(s,'home',false);
 const live=JSON.stringify({players:s.players,ball:s.ball,remaining:s.remaining,score:s.homeScore,rng:s.rng});
 assert.equal(r.start(s),true);assert.equal(r.sample(.1).replayView,true);
 assert.equal(JSON.stringify({players:s.players,ball:s.ball,remaining:s.remaining,score:s.homeScore,rng:s.rng}),live);
 for(let n=0;n<230;n++)r.sample(.1);assert.equal(r.active,false);
 r.reset();assert.equal(r.count,0);assert.equal(r.start(match()),false);
});
test('controller preferences sanitize corrupted storage; haptics degrade safely',async()=>{
 const settings=parseControls({sensitivity:NaN,touchScale:900,layout:{shoot:{x:Infinity,y:-20}},touchShot:'bad'});
 assert.equal(settings.sensitivity,1);assert.equal(settings.touchScale,1.25);assert.equal(settings.touchShot,'auto');assert.ok(Number.isFinite(settings.layout.shoot.x));
 assert.equal(await rumble(null,true),false);assert.equal(await rumble({vibrationActuator:{playEffect:async()=>{throw Error('unsupported');}}},true),false);
 let calls=0;const pad={vibrationActuator:{playEffect:async(type,p)=>{calls++;assert.equal(type,'dual-rumble');assert.ok(p.duration<=350);return 'complete';}}};
 assert.equal(await rumble(pad,false),false);assert.equal(calls,0);assert.equal(await rumble(pad,true),true);
});

// Player journey, training and connected match mechanics.
import { crossBall, aerialStrike, oneTwoPass, setLiveTactics, tacticFor, substitutePlayer, footEfficiency,
  kickBall, finishMatch, selectedIdForSide, performSkill as newSkill } from '../lib/football-engine.ts';
import { recordReception, statsFor, passAccuracy, playerRating } from '../lib/football-match-detail.ts';
import { createTraining, tickTraining, trainingHint, TRAINING_GATES } from '../lib/football-training.ts';
import { newPlayerCareer, parsePlayerCareer, makePlayerCareerMatch, settlePlayerCareer, upgradeCareer,
  nextPlayerSeason, playerCareerFixture, careerOverall, SKIN_COLORS, HAIR_COLORS } from '../lib/football-player-career.ts';
const journeyDraft={name:'João Stadler',number:10,clubId:TEAMS[0].id,role:'FW',foot:'left',weakFoot:3,trait:'technical',
  look:{skin:SKIN_COLORS[1],hair:HAIR_COLORS[0],style:'mohawk',height:185,celebration:'jump'}};
function openField(){
  const s=createMatch(TEAMS[0],TEAMS[1],'normal');s.frozen=0;
  const p=s.players.find(p=>p.side==='home'&&p.role==='FW');
  const receiver=s.players.find(q=>q.side==='home'&&q.role==='FW'&&q.id!==p.id);
  for(const q of s.players){q.sentOff=q!==p&&q!==receiver;q.vx=0;q.vy=0;}
  p.x=62;p.y=14;p.facingX=1;p.facingY=0;receiver.x=76;receiver.y=32;
  // Keep two deep defenders so the receiving player is onside.
  s.players.filter(q=>q.side==='away'&&q.role==='DF').slice(0,2).forEach((q,i)=>{q.sentOff=false;q.x=96;q.y=i?60:4;});
  s.selectedId=p.id;Object.assign(s.ball,{owner:p.id,x:p.x+1,y:p.y});return {s,p,receiver};
}
test('preferred foot, weak-foot training and live pressure change effective play',()=>{
  const {s,p}=openField();p.preferredFoot='right';p.weakFoot=1;
  assert.equal(footEfficiency(p,p.x+20,p.y+5),1);
  const weak=footEfficiency(p,p.x+20,p.y-5);assert.ok(weak<.8);
  p.weakFoot=5;assert.ok(footEfficiency(p,p.x+20,p.y-5)>weak);
  assert.equal(setLiveTactics(s,'home','attacking',1.4,1.3),false);
  s.paused=true;assert.equal(setLiveTactics(s,'home','attacking',1.4,1.3),true);
  assert.ok(tacticFor(s,'home').pressure>TACTICS.attacking.pressure);
  assert.ok(tacticFor(s,'home').width>TACTICS.attacking.width);
});
test('high cross arrives airborne while a low cross stays low and targets a teammate',()=>{
  const high=openField(),low=openField();
  assert.equal(crossBall(high.s,high.p,false),true);assert.equal(crossBall(low.s,low.p,true),true);
  assert.ok(high.s.ball.vz>10);assert.ok(low.s.ball.vz<1);
  assert.equal(high.s.selectedId,high.receiver.id);assert.equal(high.s.passIntent.receiverId,high.receiver.id);
  for(let i=0;i<60;i++)updateBall(high.s,1/120,false);
  assert.ok(high.s.ball.z>2);assert.ok(high.s.ball.x>high.p.x);
});
test('aerial timing and positioning decide contact; header counts a received cross only once',()=>{
  const {s,p,receiver}=openField();p.x=85;p.y=32;receiver.sentOff=true;
  kickBall(s,receiver,p.x,p.y,25,'pass',11);
  Object.assign(s.ball,{owner:null,x:p.x+.3,y:p.y,z:2.6,vz:-1});
  assert.equal(aerialStrike(s,p,'header'),true);
  assert.equal(statsFor(s,receiver).completed,1);assert.equal(statsFor(s,p).shots,1);
  assert.equal(aerialStrike(s,p,'header'),false);
  registerGoal(s,'home',false);assert.equal(statsFor(s,p).goals,1);assert.equal(statsFor(s,receiver).assists,1);
  const blocked=openField();blocked.p.x=83;blocked.p.y=32;
  const rival=blocked.s.players.find(q=>q.side==='away'&&q.role==='DF');rival.x=85;rival.y=32;rival.strength=95;
  blocked.p.strength=50;Object.assign(blocked.s.ball,{owner:null,x:85,y:32,z:2.6,vz:-1});
  assert.equal(aerialStrike(blocked.s,blocked.p,'header'),false);assert.equal(statsFor(blocked.s,blocked.p).shots,0);
});
test('one-two creates an attacking run and an AI return when controlling one career athlete',()=>{
  const {s,p,receiver}=openField();p.x=55;p.y=32;receiver.x=60;receiver.y=38;s.lockedPlayerId=p.id;
  assert.equal(oneTwoPass(s,p),true);assert.equal(selectedIdForSide(s,'home'),p.id);
  const before=p.x;aiTarget(s,p,undefined,.15);assert.ok(p.x>before);
  s.ball.owner=receiver.id;receiver.possessionTime=.5;
  aiTarget(s,receiver,undefined,.01);
  assert.equal(s.ball.owner,null);assert.equal(s.ball.lastPlayerId,receiver.id);assert.equal(s.oneTwo,undefined);
  assert.equal(s.passIntent.receiverId,p.id);
});
test('completed passes, saves and assists are not duplicated after a deflection',()=>{
  const {s,p,receiver}=openField();kickBall(s,p,receiver.x,receiver.y,25,'pass');
  recordReception(s,receiver);recordReception(s,receiver);assert.equal(statsFor(s,p).completed,1);
  assert.equal(passAccuracy(statsFor(s,p)),100);assert.equal(passAccuracy({passes:0,completed:0}),0);
  const keeper=s.players.find(q=>q.side==='away'&&q.role==='GK');
  kickBall(s,receiver,100,32,45,'shot');recordReception(s,keeper,false);recordReception(s,keeper,false);
  assert.equal(statsFor(s,keeper).saves,1);
  s.ball.lastPlayerId=receiver.id;s.ball.lastTouch='home';registerGoal(s,'home',false);
  assert.equal(statsFor(s,p).assists,0);
});
test('substitutions preserve historical statistics, replace attributes and cannot re-enter or remove locked player',()=>{
  const s=createMatch(TEAMS[0],TEAMS[1],'normal'),p=s.players.find(p=>p.side==='home'&&p.role==='FW');
  const index=s.benches.home.findIndex(seed=>seed[3]!=='GK'),seed=s.benches.home[index];assert.ok(seed);
  const previousId=p.squadId;statsFor(s,p).goals=1;p.stamina=9;
  assert.equal(substitutePlayer(s,'home',p.id,index),false);s.paused=true;s.lockedPlayerId=p.id;
  assert.equal(substitutePlayer(s,'home',p.id,index),false);s.lockedPlayerId=undefined;
  assert.equal(substitutePlayer(s,'home',p.id,index),true);
  const sub=s.players.find(q=>q.id===p.id);assert.equal(sub.name,seed[0]);assert.equal(sub.stamina,100);
  assert.equal(sub.overall,seed[2]);assert.equal(s.substitutions.home,1);
  assert.equal(s.detail.athletes[`home:${previousId}`].goals,1);assert.equal(statsFor(s,sub).goals,0);
  assert.ok(!s.benches.home.some(seed=>(seed[7]??`${seed[0]}-${seed[1]}`)===previousId));
});
test('training repeats drills without advancing a match clock and gives a real bicycle timing window',()=>{
  const s=createTraining('dribble'),p=s.players.find(p=>p.id===s.lockedPlayerId),remaining=s.remaining;
  const idle={keys:new Set(),touchX:0,touchY:0,touchSprint:false};
  for(let i=0;i<120;i++){updateMatch(s,idle,1/120,false);tickTraining(s);}
  assert.equal(s.remaining,remaining);
  for(const g of TRAINING_GATES){p.x=g.x;p.y=g.y;s.ball.owner=p.id;tickTraining(s);}
  assert.equal(s.training.successes,1);assert.equal(s.training.resolved,true);
  const bike=createTraining('bicycle');let ready=false;
  for(let i=0;i<100;i++){
    updateMatch(bike,idle,1/120,false);
    if(trainingHint(bike).ready){ready=true;assert.equal(newSkill(bike,'home','bicycle'),true);tickTraining(bike);break;}
  }
  assert.equal(ready,true);assert.equal(bike.training.successes,1);
  const penalty=createTraining('penalty');assert.equal(penalty.setPiece.kind,'penalty');assert.equal(penalty.setPiece.ready,true);
  for(let i=0;i<840;i++){updateMatch(penalty,idle,1/120,false);tickTraining(penalty);}
  assert.equal(penalty.stats.homeShots,0);assert.equal(penalty.penaltyDuel.phase,'aim');
});
test('player career persists appearance, rewards completed fixtures once and makes upgrades affect match OVR',()=>{
  const c=newPlayerCareer(journeyDraft,'test-athlete');assert.deepEqual(parsePlayerCareer(JSON.parse(JSON.stringify(c))),c);
  assert.equal(parsePlayerCareer({...c,points:-1}),null);assert.equal(parsePlayerCareer({...c,look:{...c.look,skin:'invalid'}}),null);
  const s=makePlayerCareerMatch(c),p=s.players.find(p=>p.squadId===c.id);
  assert.equal(p.appearance.style,'mohawk');assert.equal(p.preferredFoot,'left');assert.equal(s.lockedPlayerId,p.id);
  assert.equal(settlePlayerCareer(c,s),c);statsFor(s,p).goals=2;statsFor(s,p).assists=1;
  s.homeScore=3;s.awayScore=0;finishMatch(s);
  const result=settlePlayerCareer(c,s);assert.equal(result.appearances,1);assert.equal(result.goals,2);assert.ok(result.points>=2);
  assert.equal(settlePlayerCareer(result,s),result);assert.ok(result.history[0].rating>=8);
  let upgraded={...result,points:10};for(let i=0;i<5;i++)upgraded=upgradeCareer(upgraded,'shooting');
  assert.ok(careerOverall(upgraded)>careerOverall(result));
  assert.equal(makePlayerCareerMatch(upgraded).players.find(p=>p.squadId===c.id).shooting,upgraded.attributes.shooting);
});
test('full player season awards a league title and carries development into the next season',()=>{
  let career=newPlayerCareer(journeyDraft,'season-player'),matches=0;
  while(playerCareerFixture(career)&&matches<40){
    const s=makePlayerCareerMatch(career);s.homeScore=3;s.awayScore=0;finishMatch(s);career=settlePlayerCareer(career,s);matches++;
  }
  assert.equal(matches,(career.rows.length-1)*2);assert.equal(career.titles.length,1);assert.equal(career.titles[0].season,1);
  assert.equal(makePlayerCareerMatch(career),null);
  const next=nextPlayerSeason(career);assert.equal(next.season,2);assert.equal(next.xp,career.xp);assert.equal(next.titles.length,1);assert.ok(playerCareerFixture(next));
});
test('career athlete stays selected and all tracked values remain finite through a simulated full match',()=>{
  const c=newPlayerCareer({...journeyDraft,role:'MF'},'match-player'),s=makePlayerCareerMatch(c),id=s.lockedPlayerId;
  const input={keys:new Set(),touchX:0,touchY:0,touchSprint:false};
  for(let i=0;i<17000&&!s.finished;i++){
    updateMatch(s,input,1/120,false);
    if(!s.setPiece&&!s.frozen)assert.equal(selectedIdForSide(s,'home'),id);
  }
  assert.equal(s.finished,true);assert.ok(s.detail.athletes[`home:${c.id}`].seconds>30);
  assert.ok(s.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.stamina)));
  assert.ok(Object.values(s.detail.athletes).every(r=>Number.isFinite(playerRating(r))&&r.completed<=r.passes));
});

import { drawCup, cupOpponent, advanceCup } from '../lib/football-cup.ts';
import { beginPenaltyDuel, strikePenalty, commitPenaltyDive, shootoutWinner } from '../lib/football-penalties.ts';
import { effectiveCareerAttributes } from '../lib/football-player-career.ts';
import { proCameraPose, proCameraForward } from '../lib/football-camera.ts';
import { sonyPadPreset } from '../lib/football-gamepad.ts';

test('sixteen-team knockout draw advances four rounds with fixed opponents and no duplicates',()=>{
 let cup=drawCup(TEAMS[0],TEAMS,()=>.37);
 assert.equal(new Set(cup.rounds[0].flatMap(t=>[t.a,t.b])).size,16);
 for(let round=0;round<4;round++){
  const opponent=cupOpponent(cup);assert.ok(opponent);
  assert.equal(advanceCup(cup,'wrong-team',true,'1–0'),cup);
  cup=advanceCup(cup,opponent.id,true,'1–0',()=>.4);
  assert.equal(cup.round,round+1);
 }
 assert.equal(cup.champion,TEAMS[0].id);assert.equal(cupOpponent(cup),null);
 assert.deepEqual(cup.rounds.map(r=>r.length),[8,4,2,1]);
 const fresh=drawCup(TEAMS[0],TEAMS,()=>.63),lost=advanceCup(fresh,cupOpponent(fresh).id,false,'0–1');
 assert.equal(lost.eliminated,true);assert.equal(cupOpponent(lost),null);
});

test('cup draw transitions into controllable penalties, not a completed match',()=>{
 const s=match();s.interactivePenalties=true;s.cupRound=3;s.cupFinal=true;s.half=2;s.remaining=0;
 defense.finishMatch(s);assert.equal(s.finished,false);assert.equal(s.paused,false);assert.equal(s.penaltyDuel.phase,'aim');
 const clock=s.remaining;simulate(s,1,false);assert.equal(s.remaining,clock);assert.equal(s.penaltyDuel.phase,'aim');
});

test('penalty physics rewards directional keeper positioning and resolves misses',()=>{
 function shot(aim,dive,height=1){const s=match();s.gameMode='local2p';beginPenaltyDuel(s,true);s.penaltyDuel.aim=aim;s.penaltyDuel.height=height;s.shotCharge=.55;commitPenaltyDive(s,'away',dive);strikePenalty(s,'home');for(let i=0;i<130&&s.penaltyDuel.phase!=='result';i++)updateMatch(s,input(),1/120,false);return s.penaltyDuel;}
 assert.equal(shot(32,0).saved,true);
 assert.equal(shot(38,-1).scored,true);
 assert.equal(shot(42,-1).scored,false);
 assert.equal(shot(32,-1,5.8).scored,false);
});

test('shootout applies early elimination and paired sudden death correctly',()=>{
 const kicks=(h,a)=>[...Array.from({length:h},()=>({side:'home'})),...Array.from({length:a},()=>({side:'away'}))];
 assert.equal(shootoutWinner({home:3,away:0,kicks:kicks(3,3)}),'home');
 assert.equal(shootoutWinner({home:5,away:4,kicks:kicks(6,5)}),null);
 assert.equal(shootoutWinner({home:5,away:4,kicks:kicks(6,6)}),'home');
 assert.equal(shootoutWinner({home:5,away:5,kicks:kicks(6,6)}),null);
});

test('free-kick curve changes real velocity and taker selection preserves positions',()=>{
 const kick=curve=>{const s=match();defense.startSetPiece(s,'freeKick','home',74,28);s.setPiece.ready=true;s.setPiece.curve=curve;s.shotCharge=.5;const before=s.setPiece.takerId;assert.equal(defense.chooseSetPieceTaker(s),true);assert.notEqual(s.setPiece.takerId,before);assert.ok(defense.setPieceTrajectory(s).length>10);defense.executeSetPiece(s,'shot');return s;};
 const left=kick(-1),right=kick(1);assert.equal(left.ball.spin,-12);assert.equal(right.ball.spin,12);
 updateBall(left,.1,true);updateBall(right,.1,true);assert.notEqual(left.ball.vy,right.ball.vy);
});

test('one, three and five minute matches have two correctly scaled halves',()=>{
 for(const minutes of [1,3,5]){const s=match();defense.configureMatchDuration(s,minutes);assert.equal(s.remaining,minutes*30);s.remaining=.001;s.frozen=0;updateMatch(s,input(),.01,false);assert.equal(s.half,2);assert.equal(s.remaining,minutes*30);}
});

test('pre-match lineup swaps are reversible and formations persist without teleporting during play',()=>{
 const s=match();s.paused=true;s.preMatch=true;
 const p=s.players.find(p=>p.side==='home'&&p.role!=='GK'),old=p.squadId;
 const index=s.benches.home.findIndex(seed=>seed[3]!=='GK');assert.equal(defense.substitutePlayer(s,'home',p.id,index),true);
 assert.equal(s.substitutions.home,0);assert.ok(s.benches.home.some(seed=>seed[7]===old));
 s.preMatch=false;const position={x:p.x,y:p.y};assert.equal(defense.applyFormation(s,'home','3-2-2'),true);assert.deepEqual({x:p.x,y:p.y},position);
});

test('height, weight and Pro camera basis affect the playable athlete',()=>{
 const attributes={pace:70,shooting:70,passing:70,defending:60,strength:65,endurance:70};
 const light=effectiveCareerAttributes({attributes,look:{height:170,weight:60}}),heavy=effectiveCareerAttributes({attributes,look:{height:195,weight:100}});
 assert.ok(light.pace>heavy.pace);assert.ok(heavy.strength>light.strength);
 const s=match(),p=s.players.find(p=>p.id===s.selectedId);s.lockedPlayerId=p.id;
 const f=proCameraForward(s),camera=proCameraPose(s);assert.ok((p.x-camera.x)*f.x+(p.y-camera.z)*f.y>0);
 const i=input();i.cameraForward=f;i.keys.add('KeyW');const move=defense.movementIntent(i,'home','solo');assert.ok(move.x*f.x+move.y*f.y>.99);
});

test('Sony raw profile is usable without standard mapping and phantom unmapped buttons do not block input',()=>{
 const driver=createGamepadDriver(),p=mockPad(0,'Wireless Controller');p.mapping='';const profiles={[p.id]:sonyPadPreset(true)};
 padButton(p,13,true);driver.poll([p],'solo','playing',0,profiles);padButton(p,1,true);
 const frame=driver.poll([p],'solo','playing',16,profiles);assert.equal(frame.infos[0].usable,true);assert.ok(frame.events.some(e=>e.action==='pass'));
});

test('a complete playable shootout settles the cup final once and preserves regulation score',()=>{
 const s=match();s.gameMode='local2p';s.cupRound=3;s.cupFinal=true;s.interactivePenalties=true;s.half=2;s.remaining=0;
 defense.finishMatch(s);
 for(let i=0;i<3000&&!s.finished;i++){
  const d=s.penaltyDuel;
  if(d?.phase==='aim'){
   d.aim=d.side==='home'?38:32;s.shotCharge=s.awayShotCharge=.55;
   commitPenaltyDive(s,d.side==='home'?'away':'home',d.side==='home'?-1:0);strikePenalty(s,d.side);
  }
  updateMatch(s,input(),1/120,false);
 }
 assert.equal(s.finished,true);assert.equal(s.winner,'home');assert.equal(s.shootout.home,3);assert.equal(s.shootout.away,0);
 assert.equal(s.homeScore,0);assert.equal(s.awayScore,0);assert.ok(s.celebration);const result=structuredClone(s.shootout);defense.finishMatch(s);assert.deepEqual(s.shootout,result);
});

import * as THREE from 'three';
import { humanSurface,faceMorphGeometry } from '../lib/football-human-geometry.ts';
import { updateAthleteShape } from '../lib/football-athlete.ts';
import { startSlide,updateSlide,slideImpact,slidePose } from '../lib/football-slide.ts';

test('shared 3D face has outward normals and live sliders update morphs without rebuilding',()=>{
 const geometry=faceMorphGeometry(),face=new THREE.Mesh(geometry),a={face,head:new THREE.Group(),body:new THREE.Group()};
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 assert.ok(position.count>1200);assert.equal(geometry.morphAttributes.position.length,5);
 const ring=humanSurface([[-1,.5,.4],[1,.5,.4]]),p=ring.getAttribute('position'),n=ring.getAttribute('normal');
 assert.ok(p.getX(10)*n.getX(10)+p.getZ(10)*n.getZ(10)>0);
 updateAthleteShape(a,{height:200,weight:95,jaw:1.4,nose:.7,mouth:1.2,eyes:1.1,eyeSize:.8});
 assert.equal(face.geometry,geometry);assert.ok(Math.abs(face.morphTargetInfluences[0]-.4)<1e-8);assert.ok(a.body.scale.y>1.1);
 assert.ok([...normal.array].every(Number.isFinite));ring.dispose();geometry.dispose();face.material.dispose();
});

test('goal kicks cannot be reassigned to outfield players, even through a stale UI command',()=>{
 const s=match();defense.startSetPiece(s,'goalKick','home',5,32);const keeper=s.players.find(p=>p.side==='home'&&p.role==='GK'),outfield=s.players.find(p=>p.side==='home'&&p.role==='FW');
 assert.equal(s.setPiece.takerId,keeper.id);assert.equal(defense.chooseSetPieceTaker(s,outfield.id),false);
 s.setPiece.takerId=outfield.id;s.setPiece.ready=true;defense.executeSetPiece(s,'pass');assert.equal(s.ball.lastPlayerId,keeper.id);
 for(const kind of ['freeKick','corner','throwIn','penalty']){defense.startSetPiece(s,kind,'home',70,20);assert.notEqual(s.players.find(p=>p.id===s.setPiece.takerId).role,'GK');assert.equal(defense.chooseSetPieceTaker(s,keeper.id),false);}
});

test('both goal lines award corners only after the defending side touched the ball',()=>{
 for(const right of [true,false])for(const defenderTouch of [true,false]){
  const s=match();s.players.forEach(p=>p.sentOff=true);s.players.find(p=>p.side==='home'&&p.role==='GK').sentOff=false;s.players.find(p=>p.side==='away'&&p.role==='GK').sentOff=false;
  s.players.find(p=>p.side==='home'&&p.role==='FW').sentOff=false;s.players.find(p=>p.side==='away'&&p.role==='FW').sentOff=false;
  const attacker=right?'home':'away',defender=right?'away':'home';s.homeAttacksRight=true;
  Object.assign(s.ball,{owner:null,x:right?99.8:.2,y:10,z:1,vx:right?30:-30,vy:0,vz:0,lastTouch:defenderTouch?defender:attacker});
  updateBall(s,.02,false);assert.equal(s.setPiece.kind,defenderTouch?'corner':'goalKick');assert.equal(s.setPiece.side,defenderTouch?attacker:defender);
 }
});

test('slide tackles transition through fall, frictional slide, impact and recovery',()=>{
 const p=match().players.find(p=>p.role==='DF');p.vx=20;p.vy=0;startSlide(p);assert.equal(p.slideState.phase,'fall');
 for(let i=0;i<20;i++)updateSlide(p,.01);assert.equal(p.slideState.phase,'slide');assert.ok(p.vx<20&&p.vx>0);assert.ok(slidePose(p).ground>.9);
 slideImpact(p,'ball');assert.equal(p.slideState.phase,'impact');
 for(let i=0;i<15;i++)updateSlide(p,.01);assert.equal(p.slideState.phase,'recover');
 for(let i=0;i<45;i++)updateSlide(p,.01);assert.equal(p.slideState,undefined);assert.equal(p.slideTimer,0);assert.equal(p.vx,0);
});

import { createRiggedBody } from '../lib/football-rig.ts';

test('humanoid skin is one closed connected surface with normalized bone weights',()=>{
 const rig=createRiggedBody(Array.from({length:5},()=>new THREE.MeshStandardMaterial()));
 const g=rig.mesh.geometry,pos=g.getAttribute('position'),idx=g.index.array,edges=new Map(),parents=Array.from({length:pos.count},(_,i)=>i);
 const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){
  const a=idx[i+j],b=idx[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
  edges.set(key,(edges.get(key)??0)+1);parents[find(a)]=find(b);
 }
 assert.equal(new Set(parents.map((_,i)=>find(i))).size,1,'disconnected body pieces');
 assert.ok([...edges.values()].every(n=>n===2),'holes or non-manifold joints');
 const w=g.getAttribute('skinWeight'),bones=g.getAttribute('skinIndex');
 for(let i=0;i<pos.count;i++){
  assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);
  for(let j=0;j<4;j++){assert.ok(w.array[i*4+j]>=0);assert.ok(bones.array[i*4+j]<rig.mesh.skeleton.bones.length);}
 }
 assert.equal(g.morphAttributes.position.length,5);assert.ok(rig.mesh.isSkinnedMesh);assert.equal(rig.feet.length,2);
 rig.mesh.skeleton.dispose();g.dispose();rig.mesh.material.forEach(m=>m.dispose());
});

test('athlete build profiles change the real mesh silhouette without splitting the body',()=>{
 const mats=()=>Array.from({length:5},()=>new THREE.MeshStandardMaterial());
 const lean=createRiggedBody(mats(),false,true,{shoulders:.91,chest:.94,thigh:.94,arm:.93});
 const strong=createRiggedBody(mats(),false,true,{shoulders:1.13,chest:1.11,thigh:1.1,arm:1.09});
 const torsoWidth=rig=>{const p=rig.mesh.geometry.getAttribute('position');let total=0,count=0;for(let i=0;i<p.count;i++)if(p.getY(i)>1.72&&p.getY(i)<1.9){total+=Math.abs(p.getX(i));count++;}return total/count;};
 assert.ok(torsoWidth(strong)>torsoWidth(lean)*1.05);
 for(const rig of [lean,strong]){rig.mesh.skeleton.dispose();rig.mesh.geometry.dispose();rig.mesh.material.forEach(m=>m.dispose());}
});

test('knee animation bends the continuous skin while keeping the torso anchored',()=>{
 const rig=createRiggedBody(Array.from({length:5},()=>new THREE.MeshStandardMaterial()));
 const pos=rig.mesh.geometry.getAttribute('position');
 let foot=0,torso=0,footD=Infinity,torsoD=Infinity;
 for(let i=0;i<pos.count;i++){
  const a=Math.hypot(pos.getX(i)+.2,pos.getY(i)-.1,pos.getZ(i)-.12);
  const b=Math.hypot(pos.getX(i),pos.getY(i)-1.9,pos.getZ(i)-.19);
  if(a<footD){footD=a;foot=i;}if(b<torsoD){torsoD=b;torso=i;}
 }
 rig.root.updateMatrixWorld(true);rig.mesh.skeleton.update();
 const before=rig.mesh.getVertexPosition(foot,new THREE.Vector3());
 const fixed=rig.mesh.getVertexPosition(torso,new THREE.Vector3());
 rig.knees[0].rotation.x=1;rig.root.updateMatrixWorld(true);rig.mesh.skeleton.update();
 const after=rig.mesh.getVertexPosition(foot,new THREE.Vector3());
 assert.ok(before.distanceTo(after)>.4);assert.ok(fixed.distanceTo(rig.mesh.getVertexPosition(torso,new THREE.Vector3()))<1e-6);
 rig.mesh.morphTargetInfluences[rig.mesh.morphTargetDictionary.jaw]=.4;
 assert.ok([...rig.mesh.geometry.getAttribute('normal').array].every(Number.isFinite));
 rig.mesh.skeleton.dispose();rig.mesh.geometry.dispose();rig.mesh.material.forEach(m=>m.dispose());
});
