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
