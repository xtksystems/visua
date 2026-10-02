import { readFileSync, readdirSync } from 'node:fs';
import { computeLayout } from '../../../apps/web/src/scene/layout.ts';
import { districtHulls, type Point2 } from '../../../apps/web/src/scene/spatialGeometry.ts';
// Separating-axis test for the actual convex district surfaces.
function overlap(a: Point2[], b: Point2[]) {
  for (const hull of [a, b]) {
    for (let i = 0; i < hull.length; i++) {
      const p = hull[i]!, q = hull[(i + 1) % hull.length]!;
      const axis = [-(q[1] - p[1]), q[0] - p[0]];
      const ap = a.map(v => v[0] * axis[0]! + v[1] * axis[1]!);
      const bp = b.map(v => v[0] * axis[0]! + v[1] * axis[1]!);
      if (Math.max(...ap) <= Math.min(...bp) || Math.max(...bp) <= Math.min(...ap)) return false;
    }
  }
  return true;
}
const results = [];
for (const file of readdirSync('packages/frameworks/data').filter(f => f.endsWith('.json') && !f.startsWith('aicpa-'))) {
  const data = JSON.parse(readFileSync(`packages/frameworks/data/${file}`, 'utf8'));
  if (!Array.isArray(data.nodes)) continue;
  const hulls = [...districtHulls(computeLayout(data.nodes, 'terrain'))];
  const collisions = [];
  for (let i = 0; i < hulls.length; i++) for (let j = i + 1; j < hulls.length; j++) if (overlap(hulls[i]![1], hulls[j]![1])) collisions.push([hulls[i]![0], hulls[j]![0]]);
  results.push({ file, districts: hulls.length, collisions });
}
console.log(JSON.stringify(results, null, 2));
if (results.some(r => r.collisions.length)) process.exitCode = 1;
