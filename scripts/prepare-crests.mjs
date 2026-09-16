import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

// Download original images once at build time. Gameplay serves local PNGs and
// does not depend on a third-party image request or favicon service.
const root = resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(join(root, 'data/football-catalog.json'), 'utf8'));
const hashes = JSON.parse(await readFile(join(root, 'data/crest-checksums.json'), 'utf8'));
const directory = process.argv[2] ? resolve(process.argv[2]) : join(root, 'public/crests');
await mkdir(directory, { recursive: true });
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
function valid(bytes, id) {
  return bytes.length > 100 && bytes.length < 2_000_000 && bytes.subarray(0, 8).equals(signature)
    && createHash('sha256').update(bytes).digest('hex') === hashes[id];
}
let cursor = 0, downloaded = 0;
async function worker() {
  while (cursor < catalog.teams.length) {
    const team = catalog.teams[cursor++];
    const path = join(directory, `${team.id}.png`);
    const existing = await readFile(path).catch(() => null);
    if (existing && valid(existing, team.id)) continue;
    const source = catalog.sources[team.id].crest;
    if (!/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\/500\/\d+\.png$/.test(source))
      throw new Error(`Origem de escudo inválida: ${team.id}`);
    const response = await fetch(source, { signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`Escudo ${team.name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!valid(bytes, team.id)) throw new Error(`Escudo ${team.name} difere da imagem revisada. Confira a fonte antes de atualizar o checksum.`);
    await writeFile(path, bytes);
    downloaded++;
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`${catalog.teams.length} escudos locais verificados; ${downloaded} baixados.`);
