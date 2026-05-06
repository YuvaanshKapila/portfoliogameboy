# Game Boy · still life

A Nintendo Game Boy DMG-01 modeled procedurally in Three.js, sitting on a walnut desk.
Real WebGL — orbit, zoom, and look at it from any angle.

## Run it

ES modules need a server (file:// won't work):

```
npx serve .
# then open http://localhost:3000
```

Or any other static server (`python -m http.server`, VS Code Live Server, etc.).

## Structure

```
index.html              shell + import map
styles/
  main.css              page chrome (canvas, hint label)
src/
  main.js               renderer, camera, controls, render loop
  scene/
    lighting.js         three-point lighting + warm point lamp
    table.js            walnut desk slab
    gameBoy.js          the device — primitives composed by hand
  utils/
    materials.js        shared materials + procedural canvas textures
                        (walnut, screen, silkscreen)
```

No build step. No bundler. ES modules + an import map pull Three.js
straight from `unpkg`.

## What's modeled

- Body: rounded slab, warm gray, soft clearcoat
- Screen bezel: recessed dark plate
- LCD: greenish, faintly emissive, with the iconic `NINTENDO` boot dot
- Silkscreens: italic "Nintendo® GAME BOY™" above the screen, the
  "DOT MATRIX **WITH** STEREO SOUND" tagline below (yellow "WITH")
- D-pad: black cross with center dimple
- A / B: maroon cylinders, italic letters, cocked at -25°
- START / SELECT: black capsule pills, cocked at -25°
- Speaker: six raised slats, cocked at -25°
- Top edge: cartridge slot + power switch + OFF · ON label
- Right edge: ridged volume wheel
- Power LED + "BATTERY" label, "PHONES" label

## Lighting

- Hemisphere ambient (warm sky, cool ground)
- Warm directional **key** from upper-left (shadow caster)
- Cool directional **fill** from the right
- Warm directional **rim** from behind
- Warm point **lamp** above the desk for specular highlights

Tone-mapped (ACES), gamma-correct (sRGB), PCF soft shadows.

## Controls

- Drag to orbit
- Scroll / pinch to zoom

That's it. Just look at it.
