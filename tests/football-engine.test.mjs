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
