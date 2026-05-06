import * as THREE from 'three';

/**
 * Subtle dark "floor" — a single matte black plane that catches the
 * shadows from the Game Boy and cartridge basket. With the scene's
 * black-space background, anything more elaborate (wooden grain,
 * etc.) would clash, so we keep this minimal.
 */
export function buildTable(scene) {
  const geo = new THREE.PlaneGeometry(20, 20);
  const mat = new THREE.ShadowMaterial({ opacity: 0.55 });

  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  floor.receiveShadow = true;
  scene.add(floor);

  return floor;
}
