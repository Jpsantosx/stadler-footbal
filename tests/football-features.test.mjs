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
  assert.match(source, /function simulateLeagueRound/);
  assert.match(source, /Mundial de Clubes/);
  assert.match(source, /function transferMarketFor/);
  assert.match(source, /stadler-career-v1/);
});
