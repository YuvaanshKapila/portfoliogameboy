import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeWalnutMaterial } from '../utils/materials.js';

/**
 * Warm walnut desk slab — the surface the Game Boy and basket sit on.
 */
export function buildTable(scene) {
  const top = 0.0;
  const thickness = 0.20;

  // Big enough to fill the camera frame at any allowed orbit angle.
  const geo = new RoundedBoxGeometry(30, thickness, 22, 4, 0.04);
  const mat = makeWalnutMaterial();
  if (mat.map) {
    // tile the wood-grain texture across the bigger surface so it
    // doesn't stretch to mush
    mat.map.repeat.set(4.0, 3.0);
    mat.map.offset.set(0.05, 0.2);
    mat.map.needsUpdate = true;
  }

  const desk = new THREE.Mesh(geo, mat);
  desk.position.y = top - thickness / 2;
  desk.receiveShadow = true;
  desk.castShadow = false;
  scene.add(desk);

  return desk;
}
