import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeWalnutMaterial } from '../utils/materials.js';

/**
 * A walnut desk top. The Game Boy will rest on Y=0 (top surface).
 * The table itself is a slim, gently rounded slab.
 */
export function buildTable(scene) {
  const top = 0.0;
  const thickness = 0.18;

  const geo = new RoundedBoxGeometry(7.2, thickness, 4.6, 4, 0.04);
  const mat = makeWalnutMaterial();

  // Stretch wood grain horizontally across the long axis
  if (mat.map) {
    mat.map.repeat.set(1.2, 0.8);
    mat.map.offset.set(0.05, 0.2);
    mat.map.needsUpdate = true;
  }

  const desk = new THREE.Mesh(geo, mat);
  desk.position.y = top - thickness / 2;
  desk.receiveShadow = true;
  desk.castShadow = false;
  scene.add(desk);

  // a faint inset edge band (dark) on the side — adds a touch of cabinetry
  const edgeGeo = new RoundedBoxGeometry(7.21, thickness * 0.92, 4.61, 4, 0.04);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x21130a, roughness: 0.85, metalness: 0,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.y = top - thickness / 2;
  edge.scale.set(1.002, 0.999, 1.002);
  edge.visible = false; // disabled — too noisy at this camera distance, kept for reference
  scene.add(edge);

  return desk;
}
