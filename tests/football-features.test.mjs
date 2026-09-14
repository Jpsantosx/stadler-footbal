import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../app/football-game.tsx", import.meta.url);
const source = await readFile(sourceUrl, "utf8");

test("keeps the requested 1m50 match clock", () => {
  assert.match(source, /const HALF_SECONDS = 55;/);
  assert.match(source, /2 tempos de 55 segundos/);
});

test("ships three 8-a-side formations and four tactical postures", () => {
  for (const formation of ["2-3-2", "3-2-2", "2-2-3"]) {
    assert.match(source, new RegExp(`"${formation}"`));
  }
  for (const tactic of ["balanced", "attacking", "defensive", "counter"]) {
    assert.match(source, new RegExp(`${tactic}: \\{`));
  }
  assert.match(source, /const anchorX/);
  assert.match(source, /tactic\.pressure/);
});

test("connects OVR attributes, competitions and career market", () => {
  assert.match(source, /function attributeProfile/);
  assert.match(source, /playerAttributeFactor\(owner\.shooting\)/);
  assert.match(source, /function lineupOverall/);
  assert.match(source, /function matchTeamOverall/);
  assert.match(source, /ownOverall - rivalOverall/);
  assert.match(source, /function finishingTargetY/);
  assert.match(source, /function accuratePassTarget/);
  assert.match(source, /duelModifier\(stealer\.defending/);
  assert.match(source, /function simulateLeagueRound/);
  assert.match(source, /Mundial de Clubes/);
  assert.match(source, /function transferMarketFor/);
  assert.match(source, /stadler-career-v1/);
});

test("offers an organized club picker and complete league table", () => {
  assert.match(source, /teamPickerSide/);
  assert.match(source, /teamRegionFilter/);
  assert.match(source, /className="team-picker-grid"/);
  assert.match(source, /Classificação completa da liga/);
  assert.match(source, /<TableHead>OVR<\/TableHead>/);
  assert.match(source, /<TableHead>PTS<\/TableHead>/);
});

test("keeps championship matchmaking inside the selected league", () => {
  assert.match(source, /type LeagueId =/);
  assert.equal(source.match(/leagueId: "[^"]+"/g)?.length, 24);
  assert.match(
    source,
    /return TEAMS\.filter\(\(team\) => team\.leagueId === leagueId\)/,
  );
  assert.match(source, /selectedLeagueId/);
  assert.match(source, /className="league-selector"/);
  assert.doesNotMatch(source, /const regionalPool/);
  assert.doesNotMatch(source, /\.slice\(0, 8\)\.map\(\(row/);
});

test("gives AI role discipline, tactical line movement and player identity", () => {
  assert.match(source, /function roleProgressBounds/);
  assert.match(source, /function pressingPlayer/);
  assert.match(source, /wrongLinePenalty/);
  assert.match(source, /baseProgress \+/);
  assert.match(source, /tactic\.line/);
  assert.match(source, /type PlayerArchetype =/);
  assert.match(source, /function playerArchetypeFor/);
  assert.match(source, /player\.archetype === "creator"/);
  assert.match(source, /player\.archetype === "finisher"/);
});

test("applies career transfers atomically to budget and usable squad", () => {
  assert.match(source, /function completePurchase/);
  assert.match(source, /budget: current\.budget - price/);
  assert.match(source, /squad: \[\.\.\.current\.squad, signedPlayer\]/);
  assert.match(source, /function completeSale/);
  assert.match(source, /budget: current\.budget \+ value/);
  assert.match(source, /lineupFor\(career\.squad/);
  assert.match(source, /A contratação já fica disponível na próxima partida/);
});

test("uses official crest fallbacks, team kits and unobtrusive local controls", () => {
  assert.match(source, /function officialCrestUrl/);
  assert.equal(source.match(/officialDomain: "[^"]+"/g)?.length, 24);
  assert.match(source, /team\.kitPattern === "sash"/);
  assert.match(source, /team\.kitPattern === "chest-band"/);
  assert.match(source, /className="controls-corner-hint"/);
  assert.match(source, /className="pause-controls"/);
  assert.doesNotMatch(source, /className="keyboard-guide keyboard-guide--two"/);
});
