import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const file = resolve(root, "data/football-catalog.json");
const catalog = JSON.parse(await readFile(file, "utf8"));
const ratings = JSON.parse(
  await readFile(resolve(root, "data/player-ratings.json"), "utf8"),
);
const hash = (value) =>
  [...value].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
for (const team of catalog.teams) {
  for (const player of catalog.rosters[team.id]) {
    const age = player[4],
      keeper = player[3] === "GK";
    const youthPenalty = age < 20 ? 7 : age < 23 ? 3 : 0;
    const agePenalty =
      age > (keeper ? 36 : 32) ? Math.min(8, age - (keeper ? 34 : 30)) : 0;
    const estimate = Math.max(
      52,
      Math.min(
        84,
        team.rating - 4 + (hash(player[7]) % 7) - 3 - youthPenalty - agePenalty,
      ),
    );
    const reviewed = ratings.overrides[player[7]]?.overall;
    player[2] = reviewed ?? estimate;
    const growth =
      age < 19 ? 12 : age < 22 ? 8 : age < 25 ? 4 : age < 28 ? 1 : 0;
    player[5] = Math.max(
      player[2],
      Math.min(reviewed ? 94 : 88, player[2] + growth),
    );
  }
}
catalog.ratingModel = ratings.model;
await writeFile(file, JSON.stringify(catalog) + "\n");
console.log("OVR e potencial recalibrados; dados de identidade preservados.");
