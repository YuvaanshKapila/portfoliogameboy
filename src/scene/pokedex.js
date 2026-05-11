import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Iconic Gen 1 anime Pokédex — book-style red clamshell.
 *
 * Layout (open, book-style):
 *   - LEFT half = lid (stays fixed in this design — features on its
 *     top face are the open-pose interior)
 *   - RIGHT half = page (pivots around the Z-axis hinge at x=0)
 *   - CLOSED: page rotated -π around Z, flipped over the left half
 *
 * Iconic exterior features (lens / 3 LEDs / yellow triangle) live
 * on the page's exterior so when closed they end up face-up.
 */
export function buildPokedex() {
  const root = new THREE.Group();
  root.name = 'pokedex';

  // ============================================================
  // Materials
  // ============================================================
  const redMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8161d, roughness: 0.42, clearcoat: 0.55,
    clearcoatRoughness: 0.32, metalness: 0.05,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x101010, roughness: 0.55, metalness: 0.05,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf3f1ec, roughness: 0.45,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.35, metalness: 0.1,
  });
  const blueBtnMat = new THREE.MeshPhysicalMaterial({
    color: 0x3d7bd4, roughness: 0.35, clearcoat: 0.5,
  });
  const yellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3c81a, roughness: 0.35, clearcoat: 0.6,
  });
  const blueLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x1f6fd6, roughness: 0.05, clearcoat: 1.0,
    clearcoatRoughness: 0.05, transmission: 0.15, ior: 1.45,
  });
  const ledRedMat = new THREE.MeshStandardMaterial({
    color: 0xee2222, emissive: 0xff3a3a, emissiveIntensity: 0.9, roughness: 0.25,
  });
  const ledYellowMat = new THREE.MeshStandardMaterial({
    color: 0xf3c81a, emissive: 0xffe066, emissiveIntensity: 0.7, roughness: 0.25,
  });
  const ledGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2eb74a, emissive: 0x66e07a, emissiveIntensity: 0.7, roughness: 0.25,
  });
  const lcdGreenMat = new THREE.MeshStandardMaterial({
    color: 0x9bc46a, emissive: 0x6fa843, emissiveIntensity: 0.5, roughness: 0.4,
  });
  const redDotMat = new THREE.MeshStandardMaterial({
    color: 0xee2222, roughness: 0.4,
  });

  // ============================================================
  // Half-shell dimensions
  // ============================================================
  const halfW = 0.50;
  const halfL = 0.78;
  const halfH = 0.06;

  // ============================================================
  // LEFT HALF (stays fixed). Holds the screen-side interior.
  // ============================================================
  const leftHalf = new THREE.Group();
  leftHalf.name = 'pokedex-lid';
  leftHalf.position.x = -halfW / 2;
  root.add(leftHalf);

  const leftShell = new THREE.Mesh(
    new RoundedBoxGeometry(halfW, halfH, halfL, 6, 0.025),
    redMat,
  );
  leftShell.position.y = halfH / 2;
  leftShell.castShadow = true;
  leftShell.receiveShadow = true;
  leftShell.userData.pokedexHit = true;
  leftHalf.add(leftShell);

  // ---- LEFT HALF INTERIOR (top face, +Y) ----
  // RAISED HOOD at the top — holds the blue lens + 3 LEDs.
  const hoodW = halfW * 0.95;
  const hoodH = 0.045;
  const hoodL = halfL * 0.14;
  const hoodTopY = halfH + hoodH;
  const hoodZ = -halfL * 0.43;
  const hood = new THREE.Mesh(
    new RoundedBoxGeometry(hoodW, hoodH, hoodL, 4, 0.018),
    redMat,
  );
  hood.position.set(0, halfH + hoodH / 2, hoodZ);
  hood.castShadow = true;
  hood.userData.pokedexHit = true;
  leftHalf.add(hood);

  // Blue lens — nudged a touch left, slightly smaller.
  buildBlueLens(leftHalf, {
    x: -halfW * 0.28,
    y: hoodTopY,
    z: hoodZ,
    blueLensMat, blackMat,
    smallLens: true,
  });

  // 3 LEDs (red/yellow/green) — moved slightly toward the back of
  // the hood (more -Z) so they sit higher on the hood face.
  const ledZ = hoodZ - hoodL * 0.18;
  addLed(leftHalf, -halfW * 0.02, hoodTopY, ledZ, ledRedMat);
  addLed(leftHalf,  halfW * 0.16, hoodTopY, ledZ, ledYellowMat);
  addLed(leftHalf,  halfW * 0.32, hoodTopY, ledZ, ledGreenMat);

  // (Yellow triangle moved to the OUTSIDE of the right half / page.)

  // row2: big white-bezel screen — enlarged so the entry text and
  // photo on it read clearly at normal camera distance.
  const screenBezel = new THREE.Mesh(
    new RoundedBoxGeometry(halfW * 0.92, 0.010, halfL * 0.52, 4, 0.012),
    whiteMat,
  );
  screenBezel.position.set(0, halfH + 0.005, -halfL * 0.06);
  screenBezel.raycast = noRaycast;
  leftHalf.add(screenBezel);

  // Big screen — high-res canvas, aspect ratio matches the screen
  // plane (0.80 × 0.46 ≈ 1.74:1) so the texture isn't stretched.
  const bigScreenCanvas = document.createElement('canvas');
  bigScreenCanvas.width = 2048;
  bigScreenCanvas.height = 1180;
  const bigScreenTex = new THREE.CanvasTexture(bigScreenCanvas);
  bigScreenTex.colorSpace = THREE.SRGBColorSpace;
  bigScreenTex.anisotropy = 16;
  bigScreenTex.minFilter = THREE.LinearMipMapLinearFilter;
  bigScreenTex.magFilter = THREE.LinearFilter;
  bigScreenTex.generateMipmaps = true;
  // Bright, glowing screen with full emissive map so the cream
  // background reads as a backlit LCD instead of a dim panel.
  const bigScreenMat = new THREE.MeshBasicMaterial({
    map: bigScreenTex,
    toneMapped: false,
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 0.80, halfL * 0.46),
    bigScreenMat,
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, halfH + 0.011, -halfL * 0.06);
  screen.raycast = noRaycast;
  leftHalf.add(screen);

  // Initial render — idle screen
  drawIdleScreen(bigScreenCanvas);

  // row3: red dot + red/blue slits
  const dotC = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.008, 18),
    redDotMat,
  );
  dotC.position.set(-halfW * 0.28, halfH + 0.005, -halfL * 0.02);
  dotC.raycast = noRaycast;
  leftHalf.add(dotC);

  const slitRed = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 0.12, 0.005, 0.014),
    new THREE.MeshStandardMaterial({ color: 0xd84747, roughness: 0.4 }),
  );
  slitRed.position.set(-halfW * 0.06, halfH + 0.005, -halfL * 0.02);
  slitRed.raycast = noRaycast;
  leftHalf.add(slitRed);
  const slitBlue = slitRed.clone();
  slitBlue.material = new THREE.MeshStandardMaterial({ color: 0x3d7bd4, roughness: 0.4 });
  slitBlue.position.x = halfW * 0.16;
  leftHalf.add(slitBlue);

  // row4: small dark button + D-pad
  const smallBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20),
    blackMat,
  );
  smallBtn.position.set(-halfW * 0.30, halfH + 0.008, halfL * 0.14);
  smallBtn.raycast = noRaycast;
  leftHalf.add(smallBtn);

  const dpadCenter = new THREE.Vector3(halfW * 0.20, halfH + 0.010, halfL * 0.14);
  const dpadArm = 0.058, dpadThick = 0.018, dpadW = 0.038;
  const dpadH = new THREE.Mesh(
    new THREE.BoxGeometry(dpadArm * 2, dpadThick, dpadW), blackMat,
  );
  const dpadV = new THREE.Mesh(
    new THREE.BoxGeometry(dpadW, dpadThick, dpadArm * 2), blackMat,
  );
  dpadH.position.copy(dpadCenter);
  dpadV.position.copy(dpadCenter);
  dpadH.raycast = noRaycast; dpadV.raycast = noRaycast;
  leftHalf.add(dpadH); leftHalf.add(dpadV);

  // row5: green LCD strip
  const lcdTex = makeLcdTexture();
  const lcdMat = new THREE.MeshStandardMaterial({
    map: lcdTex, emissiveMap: lcdTex, emissive: 0xffffff,
    emissiveIntensity: 0.6, roughness: 0.4,
  });
  const lcdBezel = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 0.62, 0.006, halfL * 0.12),
    blackMat,
  );
  lcdBezel.position.set(0, halfH + 0.005, halfL * 0.36);
  lcdBezel.raycast = noRaycast;
  leftHalf.add(lcdBezel);
  const lcdScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 0.56, halfL * 0.10),
    lcdMat,
  );
  lcdScreen.rotation.x = -Math.PI / 2;
  lcdScreen.position.set(0, halfH + 0.009, halfL * 0.36);
  lcdScreen.raycast = noRaycast;
  leftHalf.add(lcdScreen);

  // ============================================================
  // RIGHT HALF (the page) — pivots around the Z hinge at x = 0.
  // SHORTER than the lid so when it's closed (covering the lid),
  // it doesn't cover the hood/lens/LEDs at the top. The page only
  // covers the screen area and below.
  // ============================================================
  // Hood occupies the back of the lid up to ~Z=-halfL*0.36. The
  // page starts just after that and runs to the lid's front edge,
  // so pageL = halfL - hood gap.
  // Hood front edge sits at Z ≈ -halfL*0.36. Page starts there and
  // runs to the lid's front edge (Z = +halfL/2). That makes the
  // page shorter than the lid by the hood's footprint.
  const pageL = halfL * 0.86;
  const pageZOffset = halfL * 0.07;  // shifts page center forward

  const pagePivot = new THREE.Group();
  pagePivot.name = 'pokedex-page-pivot';
  pagePivot.position.set(0, halfH, 0);
  root.add(pagePivot);

  const page = new THREE.Group();
  page.position.set(halfW / 2, -halfH / 2, pageZOffset);
  pagePivot.add(page);

  const pageShell = new THREE.Mesh(
    new RoundedBoxGeometry(halfW, halfH, pageL, 6, 0.025),
    redMat,
  );
  pageShell.castShadow = true;
  pageShell.receiveShadow = true;
  pageShell.userData.pokedexHit = true;
  page.add(pageShell);

  const EXT_Y = 0;
  const INT_Y = halfH;

  // (Lens / LEDs live permanently on the left-half hood so they're
  //  visible whether open or closed — see lid section.)

  // Yellow triangle decal on the OUTSIDE of the page (visible when
  // the device is CLOSED). Page mesh occupies local Y ∈ [-halfH/2,
  // +halfH/2] = [-0.03, +0.03]. The -Y face is the exterior (it
  // flips to +Y when the page rotates π closed). Place the decal
  // just below that face so it sits on the exterior surface.
  const triMatPage = new THREE.MeshStandardMaterial({
    map: makeTriangleDecal(),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
    roughness: 0.55,
  });
  const triDecalPage = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 0.42, halfW * 0.42),
    triMatPage,
  );
  triDecalPage.rotation.x = Math.PI / 2;     // plane normal → -Y
  // Also rotate around Y so the triangle points to the RIGHT in
  // the closed-pose world view (it's drawn pointing right on the
  // canvas; the page flips π around Z when closed which mirrors X,
  // so add a π rotation around Y to flip it back).
  triDecalPage.rotation.y = Math.PI;
  // Shifted RIGHT (more +X) on the page exterior.
  triDecalPage.position.set(halfW * 0.28, -halfH / 2 - 0.002, 0);
  triDecalPage.raycast = noRaycast;
  page.add(triDecalPage);

  // Small rounded rectangle slit at the BOTTOM of the page
  // exterior — the speaker/grille detail in the closed-pose ref.
  const bottomSlit = new THREE.Mesh(
    new RoundedBoxGeometry(halfW * 0.62, 0.004, 0.030, 3, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x3a0608, roughness: 0.7 }),
  );
  bottomSlit.position.set(0, -halfH / 2 - 0.001, pageL * 0.40);
  bottomSlit.raycast = noRaycast;
  page.add(bottomSlit);

  // ============================================================
  // PAGE INTERIOR (visible when open) — right-page controls
  // ============================================================
  // row1: top black strip
  const topStrip = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 0.78, 0.006, halfL * 0.08),
    blackMat,
  );
  topStrip.position.set(0, INT_Y + 0.003, -halfL * 0.34);
  topStrip.raycast = noRaycast;
  page.add(topStrip);

  // row2: blue button grid 4×3
  const gridCols = 4, gridRows = 3;
  const gbW = 0.050, gbH = 0.016, gbL = 0.040;
  const gx_step = 0.085;
  const gz_step = 0.052;
  const gx0 = -((gridCols - 1) * gx_step) / 2;
  const gridCenterZ = -halfL * 0.13;
  const gz0 = gridCenterZ - ((gridRows - 1) * gz_step) / 2;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const b = new THREE.Mesh(
        new RoundedBoxGeometry(gbW, gbH, gbL, 3, 0.006),
        blueBtnMat,
      );
      b.position.set(gx0 + c * gx_step, INT_Y + gbH / 2, gz0 + r * gz_step);
      b.raycast = noRaycast;
      page.add(b);
    }
  }

  // row3: white card slot + yellow stud
  const whiteCard = new THREE.Mesh(
    new RoundedBoxGeometry(halfW * 0.36, 0.010, halfL * 0.08, 3, 0.006),
    whiteMat,
  );
  whiteCard.position.set(-halfW * 0.16, INT_Y + 0.005, halfL * 0.06);
  whiteCard.raycast = noRaycast;
  page.add(whiteCard);

  const yellowStud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.014, 20),
    yellowMat,
  );
  yellowStud.position.set(halfW * 0.26, INT_Y + 0.007, halfL * 0.06);
  yellowStud.raycast = noRaycast;
  page.add(yellowStud);

  // row4: two small black ovals
  for (let i = 0; i < 2; i++) {
    const oval = new THREE.Mesh(
      new THREE.BoxGeometry(0.060, 0.006, 0.022),
      blackMat,
    );
    oval.position.set(-halfW * 0.18 + i * (halfW * 0.36), INT_Y + 0.003, halfL * 0.20);
    oval.raycast = noRaycast;
    page.add(oval);
  }

  // row5: two bottom black strips
  const botStrip1 = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 0.34, 0.006, halfL * 0.08),
    blackMat,
  );
  botStrip1.position.set(-halfW * 0.20, INT_Y + 0.003, halfL * 0.34);
  botStrip1.raycast = noRaycast;
  page.add(botStrip1);
  const botStrip2 = botStrip1.clone();
  botStrip2.position.x = halfW * 0.20;
  page.add(botStrip2);

  // ============================================================
  // Hinge — vertical cylinder along Z at the seam
  // ============================================================
  const hingeR = 0.024;
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(hingeR, hingeR, halfL * 0.94, 20),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.4, metalness: 0.7,
    }),
  );
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(0, halfH / 2, 0);
  hinge.castShadow = true;
  root.add(hinge);

  // ============================================================
  // Open/closed state
  // ============================================================
  // Open direction — page swings outward to +X. Positive-π closed
  // pose makes the page rotate via the +Y arc on the way to
  // closed (lifting up, over, and down) rather than via -Y.
  const OPEN_Z   = 0;
  const CLOSED_Z = Math.PI;
  pagePivot.rotation.z = CLOSED_Z;

  root.userData.pagePivot = pagePivot;
  root.userData.isOpen = false;
  root.userData.angle = CLOSED_Z;
  root.userData.OPEN_Z = OPEN_Z;
  root.userData.CLOSED_Z = CLOSED_Z;

  const hitTargets = [];
  root.traverse((o) => {
    if (o.isMesh && o.raycast !== noRaycast) hitTargets.push(o);
  });

  // ============================================================
  // Scan API — render a card's photo + entry on the big screen
  // and play its voice MP3. Closing the lid stops audio + clears
  // the screen back to idle.
  // ============================================================
  // Pre-cache loaded photo images so re-scanning is instant.
  const photoCache = new Map();
  function loadPhoto(src) {
    if (photoCache.has(src)) return Promise.resolve(photoCache.get(src));
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { photoCache.set(src, img); resolve(img); };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Volume settings — voice is quiet, SFX even quieter so the
  // voice line is the focus.
  const VOICE_VOLUME = 0.35;
  const STARTUP_SFX_VOLUME = 0.18;
  const CLICK_SFX_VOLUME = 0.25;

  // Single shared audio element so only one voice plays at a time.
  let currentAudio = null;
  let currentSfx = null;
  let currentCardId = null;
  function stopAudio() {
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (_) {}
      currentAudio = null;
    }
  }
  function stopSfx() {
    if (currentSfx) {
      try { currentSfx.pause(); currentSfx.currentTime = 0; } catch (_) {}
      currentSfx = null;
    }
  }

  // Pokédex SFX — plays on every open. Returns a promise that
  // resolves when the SFX finishes so callers can sequence audio.
  // Tracks the current SFX in `currentSfx` so closing the lid
  // can stop it immediately.
  const STARTUP_SFX = encodeURI('/Pokemon Red_Blue_Yellow - Pokédex 1 - Sound Effect.mp3');
  function playStartupSfx() {
    stopSfx();
    return new Promise((resolve) => {
      try {
        const a = new Audio(STARTUP_SFX);
        a.volume = STARTUP_SFX_VOLUME;
        currentSfx = a;
        const done = () => {
          if (currentSfx === a) currentSfx = null;
          resolve();
        };
        a.addEventListener('ended', done, { once: true });
        a.addEventListener('error', done, { once: true });
        setTimeout(done, 5000);
        a.play().catch(done);
      } catch (_) { resolve(); }
    });
  }

  // Synthesized click sound via Web Audio — short, low-volume tick
  // for open/close. No asset needed.
  let audioCtx = null;
  function playClick(highPitch) {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = highPitch ? 1200 : 800;
      gain.gain.setValueAtTime(CLICK_SFX_VOLUME, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.07);
    } catch (_) {}
  }

  // Card list passed in via setCards() so we can choose a random
  // one when the Pokédex first opens.
  let cardPool = [];
  function setCards(cards) { cardPool = cards || []; }

  // Monotonically incrementing generation token. Each scan() call
  // captures the current value; any await that resumes with a stale
  // token aborts. This prevents spam-click races where multiple
  // overlapping scans would play audio + draw on top of each other.
  let scanGen = 0;

  async function scan(card) {
    if (!card) return;
    if (!root.userData.isOpen) return;

    // Cancel everything from prior scans
    stopAudio();
    stopSfx();

    const gen = ++scanGen;
    currentCardId = card.id;

    // 1) Pokédex SFX plays FIRST — every scan, every time.
    const sfxDone = playStartupSfx();

    // 2) Meanwhile, load the photo and render the screen so it's
    //    ready by the time the SFX finishes.
    const img = await loadPhoto(card.image);
    if (gen !== scanGen) return;            // a newer scan superseded us
    if (!root.userData.isOpen) return;
    drawCardScreen(bigScreenCanvas, card, img);
    bigScreenTex.needsUpdate = true;

    // 3) Wait for the SFX to finish, then play the voice line.
    await sfxDone;
    if (gen !== scanGen) return;            // superseded during the SFX wait
    if (!root.userData.isOpen) return;

    try {
      stopAudio();                          // safety — kill any stragglers
      currentAudio = new Audio(card.audio);
      currentAudio.volume = VOICE_VOLUME;
      currentAudio.play().catch(() => {});
    } catch (_) {}
  }

  function clearScan() {
    stopAudio();
    stopSfx();
    scanGen++;   // invalidate any in-flight scans
    currentCardId = null;
    drawIdleScreen(bigScreenCanvas);
    bigScreenTex.needsUpdate = true;
  }

  // Pick a fresh random card and scan it. Used when the user
  // clicks a card while the Pokédex is already open.
  function rerollRandom() {
    if (!root.userData.isOpen) return;
    if (cardPool.length === 0) return;
    let pick = cardPool[Math.floor(Math.random() * cardPool.length)];
    // Avoid repeating the same card if possible
    if (cardPool.length > 1 && currentCardId === pick.id) {
      pick = cardPool[(cardPool.indexOf(pick) + 1) % cardPool.length];
    }
    scan(pick);
  }

  // Hook into open/close. Opening: play the Pokédex SFX + a click,
  // and after a short delay scan a random card (faithful to the
  // anime: open the Pokédex → it boots up → shows an entry).
  // Closing: click sound, stop audio, clear screen.
  function setOpen(open) {
    const wasOpen = root.userData.isOpen;
    if (wasOpen === !!open) return;
    root.userData.isOpen = !!open;

    if (!wasOpen && open) {
      // OPEN: click sound + Pokédex SFX. Screen stays on idle
      // until the user clicks a card to scan.
      playClick(true);
      playStartupSfx();
    } else {
      // CLOSE: click + stop SFX + stop voice + clear screen.
      playClick(false);
      stopSfx();
      clearScan();
    }
  }

  function update(dt) {
    const target = root.userData.isOpen ? root.userData.OPEN_Z : root.userData.CLOSED_Z;
    const cur = root.userData.angle;
    if (Math.abs(target - cur) < 0.001) {
      pagePivot.rotation.z = target;
      root.userData.angle = target;
      return;
    }
    const k = Math.min(1, dt * 5.5);
    const next = cur + (target - cur) * k;
    pagePivot.rotation.z = next;
    root.userData.angle = next;
  }

  return { group: root, hitTargets, update, setOpen, scan, clearScan, setCards, rerollRandom };
}

/* ------------------------------------------------------------------
   Big-screen renderers — drawn on canvas, used as a texture on the
   Pokédex's main display.
   ------------------------------------------------------------------ */
function drawIdleScreen(canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // Header bar
  ctx.fillStyle = '#9a1818';
  ctx.fillRect(0, 0, W, 180);
  ctx.fillStyle = '#fff8dc';
  ctx.font = '400 92px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POKEDEX', W / 2, 90);
  // Body
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '400 90px "Press Start 2P", monospace';
  ctx.fillText('READY', W / 2, H / 2 - 40);
  ctx.font = '400 44px "Press Start 2P", monospace';
  ctx.fillText('CLICK CARD TO SCAN', W / 2, H / 2 + 80);
}

function drawCardScreen(canvas, card, photoImg) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // === Header bar — subtle, plain name ===
  const headerH = 110;
  ctx.fillStyle = '#9a1818';
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#fff8dc';
  let titleSize = 64;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (titleSize > 32) {
    ctx.font = `600 ${titleSize}px "Jost", "Futura", sans-serif`;
    if (ctx.measureText(card.name).width <= W - 80) break;
    titleSize -= 4;
  }
  ctx.fillText(card.name, W / 2, headerH / 2);

  // === Two-column body — photo LEFT (50% width), text RIGHT (50%) ===
  const bodyY = headerH;
  const bodyH = H - headerH;
  const colW = W / 2;
  const margin = 30;

  // PHOTO column on the LEFT — COVER-fit so the image fills the
  // frame completely (no empty letterbox bars showing through).
  const photoX = margin;
  const photoY = bodyY + margin;
  const photoW = colW - margin * 1.5;
  const photoH = bodyH - margin * 2;
  if (photoImg) {
    const iw = photoImg.naturalWidth || photoImg.width;
    const ih = photoImg.naturalHeight || photoImg.height;
    const s = Math.max(photoW / iw, photoH / ih);
    const dw = iw * s, dh = ih * s;
    const dx = photoX + (photoW - dw) / 2;
    const dy = photoY + (photoH - dh) / 2;
    // Clip to the photo frame so the overflow from cover-fit
    // doesn't bleed onto the text column.
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photoImg, dx, dy, dw, dh);
    ctx.restore();
  }

  // TEXT column on the RIGHT — big black text on white
  const textX = colW + margin * 0.5;
  const textY = bodyY + margin;
  const textW = colW - margin * 1.5;
  const textH = bodyH - margin * 2;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Auto-fit: start LARGE and shrink until it fits.
  let bodySize = 64;
  while (bodySize > 20) {
    ctx.font = `400 ${bodySize}px "Press Start 2P", "Courier New", monospace`;
    const lineH = bodySize * 1.55;
    const lines = countWrappedLines(ctx, card.text, textW);
    if (lines * lineH <= textH) break;
    bodySize -= 4;
  }
  const lineH = bodySize * 1.55;
  wrapText(ctx, card.text, textX, textY, textW, lineH);
}

function countWrappedLines(ctx, text, maxW) {
  const words = text.split(/\s+/);
  let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      n++; line = words[i];
    } else {
      line = test;
    }
  }
  if (line) n++;
  return n;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(/\s+/);
  let line = '';
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */
function noRaycast() {}

function buildBlueLens(parent, opts) {
  const { x, y, z, blueLensMat, blackMat, flipDown = false, smallLens = false } = opts;
  const dir = flipDown ? -1 : 1;
  const r = smallLens ? 0.048 : 0.064;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(r, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    blueLensMat,
  );
  dome.position.set(x, y + dir * 0.008, z);
  dome.scale.set(1, 0.60 * dir, 1);
  dome.raycast = noRaycast;
  dome.castShadow = true;
  parent.add(dome);
}

function addLed(parent, x, y, z, ledMat, flipDown = false) {
  // Clean colored dome — no black outline / recess ring.
  const dir = flipDown ? -1 : 1;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    ledMat,
  );
  dome.position.set(x, y + dir * 0.004, z);
  dome.scale.set(1, 0.55 * dir, 1);
  dome.raycast = noRaycast;
  parent.add(dome);
}

function makeTriangleDecal() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#e8b81a';
  ctx.strokeStyle = '#2a1f04';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, 40);
  ctx.lineTo(60, 216);
  ctx.lineTo(220, 128);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeLcdTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a8c878';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#3a4a22';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = '#2a3a16';
  ctx.font = '700 38px "Jost", "Futura", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('POKéDEX', 30, 30);
  ctx.font = '600 28px "Jost", sans-serif';
  ctx.fillText('READY...', 30, 90);
  ctx.fillText('No.---', 30, 140);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < 256; y += 3) ctx.fillRect(0, y, 512, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
