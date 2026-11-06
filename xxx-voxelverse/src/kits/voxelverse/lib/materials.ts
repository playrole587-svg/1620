// Shared materials. Surfaces are grouped by how they respond to light, not by what
// they depict: colour lives in the vertex data, response lives here.

import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  Texture,
} from "three";
import type { MatKey } from "./voxel";

const std = (roughness: number, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ vertexColors: true, roughness, metalness }), extra);

let cache: Record<MatKey, MeshStandardMaterial> | null = null;
export const mats = () =>
  (cache ??= {
    matte: std(0.86),
    fabric: std(0.97),
    foliage: std(0.75),
    satin: std(0.48),
    // Rain-soaked horizontal surfaces: low roughness so lamps leave real highlights.
    wet: std(0.24, 0, { envMapIntensity: 1.25 }),
    metal: std(0.34, 0.85),
    gloss: std(0.1, 0, { envMapIntensity: 1.4 }),
  });

/**
 * Instanced emissive panes (windows, bulbs, signs). Each instance carries
 *   aGlow  — emission strength, animated per frame
 *   aTint  — linear RGB colour of the light behind the pane
 *   aCell  — atlas cell offset (u, v) into a 2×2 interior atlas
 * Unlit panes keep a dark, reflective glass response.
 */
export const makeGlowPaneMaterial = (atlas: Texture | null, base = 0x1b2426) => {
  const m = new MeshStandardMaterial({
    color: base,
    roughness: 0.14,
    metalness: 0.0,
    emissive: new Color(1, 1, 1),
    emissiveMap: atlas,
    envMapIntensity: 1.1,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float aGlow; attribute vec3 aTint; attribute vec2 aCell;
varying float vGlow; varying vec3 vTint; varying vec2 vCell;`,
      )
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n vGlow = aGlow; vTint = aTint; vCell = aCell;`);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vGlow; varying vec3 vTint; varying vec2 vCell;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        atlas
          ? `vec3 interior = texture2D(emissiveMap, vCell + vEmissiveMapUv * 0.5).rgb;
totalEmissiveRadiance = interior * vTint * vGlow;
diffuseColor.rgb *= 1.0 - clamp(vGlow, 0.0, 1.0) * 0.85;`
          : `totalEmissiveRadiance = vTint * vGlow;
diffuseColor.rgb *= 1.0 - clamp(vGlow, 0.0, 1.0) * 0.85;`,
      );
  };
  m.customProgramCacheKey = () => (atlas ? "glowpane-atlas" : "glowpane");
  return m;
};

/** Unlit additive glow (light cones, wet-road streaks, halos). Opacity is driven per object. */
export const additive = (map: Texture, color: number | Color, opacity = 1) =>
  new MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: true,
    fog: false,
  });

/** Soft volumetric cone under a lamp: fades along its length and towards its silhouette. */
export const makeConeMaterial = (color: number) =>
  new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vH; varying vec3 vN; varying vec3 vView;
      void main() {
        vH = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity;
      varying float vH; varying vec3 vN; varying vec3 vView;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vView)));
        float edge = smoothstep(0.0, 0.85, facing);
        float along = pow(vH, 1.6);           // uv.y = 1 at the lamp, 0 at the ground
        float a = edge * along * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
