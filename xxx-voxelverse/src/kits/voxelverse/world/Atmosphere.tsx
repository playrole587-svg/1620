// Overcast dusk: a sky dome with slow cloud banks, an image-based environment (sky plus warm and cool
// light boxes) so wet and glossy voxels have something to reflect, a cool key light with soft shadows,
// a hemisphere fill and exponential fog. Everything is driven by props: no film-specific state.

import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { BackSide, BoxGeometry, Color, FogExp2, Mesh, MeshBasicMaterial, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry } from "three";
import { C } from "../lib/palette";
import type { V3 } from "../lib/voxel";

export type SkyLook = { top: number; mid: number; low: number };
export const DUSK: SkyLook = { top: C.hazeTop, mid: C.haze, low: C.horizon };

const skyMaterial = (look: SkyLook) =>
  new ShaderMaterial({
    uniforms: {
      uTop: { value: new Color(look.top) },
      uMid: { value: new Color(look.mid) },
      uLow: { value: new Color(look.low) },
      uBoost: { value: 1 },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform float uBoost; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float y = vDir.y;
        vec3 c = mix(uMid, uTop, smoothstep(0.05, 0.6, y));
        c = mix(uLow, c, smoothstep(-0.12, 0.16, y));
        c = mix(vec3(0.016, 0.026, 0.027), c, smoothstep(-0.55, -0.04, y));
        float az = atan(vDir.z, vDir.x);
        float cl = n(vec2(az * 3.0, y * 9.0)) * 0.6 + n(vec2(az * 7.0, y * 21.0)) * 0.4;
        c *= 0.9 + 0.16 * cl * smoothstep(0.0, 0.35, y);
        gl_FragColor = vec4(c * uBoost, 1.0);
      }`,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });

/** Sky dome. `boost` < 1 deepens the dusk (e.g. as windows light up). */
export const Sky: React.FC<{ look?: SkyLook; boost?: number; radius?: number }> = ({ look = DUSK, boost = 1, radius = 420 }) => {
  const mat = useMemo(() => skyMaterial(look), [look]);
  mat.uniforms.uBoost.value = boost;
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  );
};

/** Reflection environment: the sky plus a ring of warm (and a few cool) light boxes at street level. */
export const Environment: React.FC<{ look?: SkyLook; intensity?: number }> = ({ look = DUSK, intensity = 0.42 }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const env = new Scene();
    env.add(new Mesh(new SphereGeometry(50, 32, 16), skyMaterial(look)));
    const warm = new MeshBasicMaterial({ color: new Color(C.lampWarm).multiplyScalar(2.2) });
    const cool = new MeshBasicMaterial({ color: new Color(C.tealSoft).multiplyScalar(0.8) });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const m = new Mesh(new BoxGeometry(2.5, 1.4 + (i % 3) * 0.6, 0.2), i % 4 === 0 ? cool : warm);
      m.position.set(Math.cos(a) * 30, 3 + (i % 3) * 2, Math.sin(a) * 30);
      m.lookAt(0, 3, 0);
      env.add(m);
    }
    const pm = new PMREMGenerator(gl);
    const rt = pm.fromScene(env, 0.035);
    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      rt.dispose();
      pm.dispose();
    };
  }, [gl, scene, look, intensity]);
  return null;
};

/** Exponential fog; set the density per shot (≈0.012–0.02 at street level, ≈0.002 for a wide). */
export const Fog: React.FC<{ density: number; color?: number }> = ({ density, color = C.haze }) => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    if (!(scene.fog instanceof FogExp2)) scene.fog = new FogExp2(new Color(color), density);
    (scene.fog as FogExp2).color.set(color);
    (scene.fog as FogExp2).density = density;
  }, [scene, density, color]);
  return null;
};

/** Cool dusk key with soft shadows over a `size`-metre area, plus hemisphere fill. */
export const DuskLight: React.FC<{ from?: V3; intensity?: number; size?: number; fill?: number }> = ({ from = [-16, 30, 26], intensity = 1.15, size = 30, fill = 0.55 }) => (
  <group>
    <hemisphereLight args={[0xa9c2c0, 0x5a473a, fill]} />
    <directionalLight
      position={from}
      intensity={intensity}
      color={0xc4d8d6}
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0003}
      shadow-normalBias={0.03}
      shadow-camera-left={-size}
      shadow-camera-right={size}
      shadow-camera-top={size}
      shadow-camera-bottom={-size}
      shadow-camera-near={1}
      shadow-camera-far={Math.hypot(...from) + size * 2}
    />
  </group>
);
