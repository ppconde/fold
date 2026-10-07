// Restores the CC BY 4.0 crane (JuanG3D) from old_main, stripped of its textures to stay tiny.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const src = 'old_main:public/models/3d_origami_crane/';
const out = 'public/models/crane/';
const show = (f) => execFileSync('git', ['show', src + f], { maxBuffer: 1 << 28 });

const gltf = JSON.parse(show('scene.gltf').toString('utf8'));
delete gltf.images;
delete gltf.textures;
delete gltf.samplers;
for (const m of gltf.materials ?? []) delete m.pbrMetallicRoughness?.baseColorTexture;

mkdirSync(out, { recursive: true });
writeFileSync(`${out}scene.gltf`, `${JSON.stringify(gltf, null, 2)}\n`);
writeFileSync(`${out}scene.bin`, show('scene.bin'));
