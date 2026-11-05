import React, { useMemo } from "react";
import { PixelCanvas } from "../pixel/PixelCanvas";
import { PX } from "../pixel/views";
import type { Albedo } from "./albedo";
import { relight, type Light, type RelightOpts } from "../lighting/relight";
import { compositeTemplate, templateOf, type Seam, type TemplateStyle } from "./template";

const aliveCache = new WeakMap<Albedo, Map<string, Uint8ClampedArray>>();
const aliveOf = (a: Albedo, lights: Light[], opts: RelightOpts) => {
  const key = JSON.stringify([lights, opts]);
  let m = aliveCache.get(a);
  if (!m) aliveCache.set(a, (m = new Map()));
  let px = m.get(key);
  if (!px) {
    px = relight(a, lights, opts);
    if (m.size > 4) m.clear();
    m.set(key, px);
  }
  return px;
};

type Props = {
  albedo: Albedo;
  lights?: Light[];
  opts: RelightOpts;
  style: TemplateStyle;
  /** Signed distance to the template boundary (> 0 alive). Omit when nothing is template. */
  mask?: ((sx: number, sy: number) => number) | null;
  seams?: Seam[];
};

/** A set layer that can be partly an unfinished template, partly alive. */
export const TemplateAlbedoView: React.FC<Props> = ({ albedo, lights = [], opts, style, mask, seams = [] }) => {
  const alive = aliveOf(albedo, lights, opts);
  const pixels = useMemo(
    () => (mask ? compositeTemplate(albedo, alive, templateOf(albedo, style), mask, seams) : alive),
    [albedo, alive, mask, style, seams],
  );
  return (
    <div style={{ position: "absolute", left: albedo.ox * PX, top: albedo.oy * PX }}>
      <PixelCanvas w={albedo.w} h={albedo.h} pixels={pixels} scale={PX} />
    </div>
  );
};
