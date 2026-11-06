// Camera + finishing. The rig applies the camera state for this frame before R3F advances, then a
// composer renders: scene → ground-truth AO → depth of field → restrained bloom →
// tone mapping → grade (vignette, black lift, grain). AO and DoF read depth from
// layer 0 only, so rain, halos and light cones never confuse them.

import React, { useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { HalfFloatType, PerspectiveCamera, Vector2, WebGLRenderTarget } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { CamState } from "./rig";
import { FX_LAYER } from "../lib/layers";

export const CameraRig: React.FC<{ cam: CamState }> = ({ cam: c }) => {
  const { camera, gl } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.lookAt(...c.at);
    cam.fov = c.fov;
    cam.near = 0.03;
    cam.far = 600;
    cam.layers.enable(FX_LAYER);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    gl.toneMappingExposure = c.exposure;
  }, [c, camera, gl]);
  return null;
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uLift: { value: 0.022 },
    uGrain: { value: 0.035 },
    uRes: { value: new Vector2(1080, 1920) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uLift; uniform float uGrain; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // gentle split-tone: teal in the shadows, warmth in the highlights
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb += (1.0 - smoothstep(0.0, 0.45, l)) * vec3(-0.006, 0.006, 0.008);
      c.rgb += smoothstep(0.55, 1.0, l) * vec3(0.012, 0.004, -0.01);
      // lift the floor so shadows stay readable on a phone
      c.rgb = uLift + c.rgb * (1.0 - uLift);
      // vignette (elliptical for 9:16)
      vec2 d = (vUv - 0.5) * vec2(1.0, 1.35);
      c.rgb *= 1.0 - uVignette * smoothstep(0.25, 0.85, length(d));
      // film grain, seeded by the frame (deterministic)
      float g = hash(vUv * uRes + uTime * 17.0) - 0.5;
      c.rgb += g * uGrain * (0.6 + 0.4 * (1.0 - l));
      gl_FragColor = c;
    }`,
};

/** Replaces NaN/Inf (half-float overflow) before blur-based passes can spread it. */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 48.0), 1.0);
    }`,
};

/** `frame` seeds the grain; `mask` lists the passes to run (drop "ao" or "dof" to isolate a problem). */
export const Post: React.FC<{ cam: CamState; frame: number; mask?: string }> = ({ cam, frame, mask = "ao,sanitize,dof,bloom,grade" }) => {
  const { gl, scene, camera, size } = useThree();
  const chain = useMemo(() => {
    const w = size.width, h = size.height;
    const rt = new WebGLRenderTarget(w, h, { type: HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, rt);
    composer.setPixelRatio(1);
    composer.setSize(w, h);
    const render = new RenderPass(scene, camera);
    const ao = new GTAOPass(scene, camera, w, h);
    ao.blendIntensity = 0.85;
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.0, scale: 1.0, samples: 12, distanceFallOff: 1.0, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    const dof = new BokehPass(scene, camera, { focus: 3, aperture: 0.002, maxblur: 0.009 });
    const bloom = new UnrealBloomPass(new Vector2(w, h), 0.32, 0.55, 0.92);
    const output = new OutputPass();
    const grade = new ShaderPass(GradeShader);
    grade.uniforms.uRes.value.set(w, h);
    // depth-reading passes see layer 0 only
    for (const p of [ao, dof]) {
      const orig = p.render.bind(p);
      p.render = (...args: Parameters<typeof orig>) => {
        const mask = camera.layers.mask;
        camera.layers.disable(FX_LAYER);
        orig(...args);
        camera.layers.mask = mask;
      };
    }
    const on = (k: string) => mask.split(",").includes(k);
    composer.addPass(render);
    if (on("ao")) composer.addPass(ao);
    if (on("sanitize")) composer.addPass(new ShaderPass(SanitizeShader));
    if (on("dof")) composer.addPass(dof);
    if (on("bloom")) composer.addPass(bloom);
    composer.addPass(output);
    if (on("grade")) composer.addPass(grade);
    return { composer, dof, grade, bloom };
  }, [gl, scene, camera, size.width, size.height, mask]);

  useLayoutEffect(() => {
    const u = chain.dof.uniforms as unknown as Record<string, { value: number }>;
    u.focus.value = cam.focusDist;
    u.aperture.value = cam.aperture;
    u.maxblur.value = cam.maxBlur;
    chain.grade.uniforms.uTime.value = Math.floor(frame) % 997;
  }, [frame, chain, cam]);

  // priority 1: we own the render
  useFrame(() => {
    chain.composer.render();
  }, 1);
  return null;
};
