// Voxel modelling kit. Models are authored as lists of chamfered boxes inside a
// transform stack, then merged into one BufferGeometry per material class, with
// per-box vertex colour. A small chamfer on every edge is what makes the world read
// as a crafted miniature instead of default unlit cubes: each edge catches light.

import { BufferAttribute, BufferGeometry, Color, Euler, Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import { rng } from "../core/noise";

export type V3 = [number, number, number];
export type MatKey = "matte" | "satin" | "wet" | "metal" | "gloss" | "fabric" | "foliage";
export type ColorIn = number | string | Color;

type Tri = { p: number[]; n: number[] }; // non-indexed triangles for a unit template

/** Flat-shaded chamfered box template, centred, with half extents and chamfer r. */
const template = (() => {
  const cache = new Map<string, Tri>();
  return (hx: number, hy: number, hz: number, r: number): Tri => {
    const key = `${hx.toFixed(4)}|${hy.toFixed(4)}|${hz.toFixed(4)}|${r.toFixed(4)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const p: number[] = [];
    const n: number[] = [];
    const poly = (pts: number[][], nx: number, ny: number, nz: number) => {
      const len = Math.hypot(nx, ny, nz);
      const N = [nx / len, ny / len, nz / len];
      // Fix winding so the polygon faces its outward normal.
      const [a, b, c] = pts;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      const ordered = cx * N[0] + cy * N[1] + cz * N[2] < 0 ? [...pts].reverse() : pts;
      for (let i = 1; i < ordered.length - 1; i++) {
        for (const q of [ordered[0], ordered[i], ordered[i + 1]]) {
          p.push(q[0], q[1], q[2]);
          n.push(N[0], N[1], N[2]);
        }
      }
    };
    if (r <= 0) {
      for (const s of [1, -1]) {
        poly([[s * hx, -hy, -hz], [s * hx, hy, -hz], [s * hx, hy, hz], [s * hx, -hy, hz]], s, 0, 0);
        poly([[-hx, s * hy, -hz], [hx, s * hy, -hz], [hx, s * hy, hz], [-hx, s * hy, hz]], 0, s, 0);
        poly([[-hx, -hy, s * hz], [hx, -hy, s * hz], [hx, hy, s * hz], [-hx, hy, s * hz]], 0, 0, s);
      }
    } else {
      const ix = hx - r, iy = hy - r, iz = hz - r;
      for (const s of [1, -1]) {
        poly([[s * hx, -iy, -iz], [s * hx, iy, -iz], [s * hx, iy, iz], [s * hx, -iy, iz]], s, 0, 0);
        poly([[-ix, s * hy, -iz], [ix, s * hy, -iz], [ix, s * hy, iz], [-ix, s * hy, iz]], 0, s, 0);
        poly([[-ix, -iy, s * hz], [ix, -iy, s * hz], [ix, iy, s * hz], [-ix, iy, s * hz]], 0, 0, s);
      }
      for (const a of [1, -1])
        for (const b of [1, -1]) {
          // X-Y edges run along Z
          poly([[a * hx, b * iy, -iz], [a * ix, b * hy, -iz], [a * ix, b * hy, iz], [a * hx, b * iy, iz]], a, b, 0);
          // X-Z edges run along Y
          poly([[a * hx, -iy, b * iz], [a * ix, -iy, b * hz], [a * ix, iy, b * hz], [a * hx, iy, b * iz]], a, 0, b);
          // Y-Z edges run along X
          poly([[-ix, a * hy, b * iz], [-ix, a * iy, b * hz], [ix, a * iy, b * hz], [ix, a * hy, b * iz]], 0, a, b);
        }
      for (const a of [1, -1])
        for (const b of [1, -1])
          for (const c of [1, -1])
            poly([[a * hx, b * iy, c * iz], [a * ix, b * hy, c * iz], [a * ix, b * iy, c * hz]], a, b, c);
    }
    const t = { p, n };
    cache.set(key, t);
    return t;
  };
})();

class Buf {
  data = new Float32Array(1 << 14);
  len = 0;
  push3(a: number, b: number, c: number) {
    if (this.len + 3 > this.data.length) {
      const next = new Float32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.len++] = a;
    this.data[this.len++] = b;
    this.data[this.len++] = c;
  }
  out() {
    return this.data.slice(0, this.len);
  }
}

export type BoxOpts = {
  mat?: MatKey;
  /** chamfer size; default scales with the smallest side */
  r?: number;
  rot?: V3;
  /** ± lightness variation, 0..1 */
  jitter?: number;
};

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _v = new Vector3();
const _n = new Vector3();
const _c = new Color();
const _s = new Vector3(1, 1, 1);

export class Vox {
  private parts = new Map<MatKey, { p: Buf; n: Buf; c: Buf }>();
  private stack: Matrix4[] = [new Matrix4()];
  readonly rand: () => number;
  count = 0;

  constructor(seed = 1) {
    this.rand = rng(seed);
  }

  private get top() {
    return this.stack[this.stack.length - 1];
  }

  /** Run `fn` inside a local transform (translate, then rotate XYZ). */
  at(pos: V3, rot: V3 | number, fn: () => void) {
    const r: V3 = typeof rot === "number" ? [0, rot, 0] : rot;
    _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    const local = new Matrix4().compose(_v.set(pos[0], pos[1], pos[2]), _q, _s);
    this.stack.push(this.top.clone().multiply(local));
    fn();
    this.stack.pop();
  }

  /** Box centred at p with full size `size`. */
  box(p: V3, size: V3, color: ColorIn, o: BoxOpts = {}) {
    const [w, h, d] = size;
    const minSide = Math.min(w, h, d);
    const r = Math.min(o.r ?? Math.min(0.045, minSide * 0.18), minSide * 0.45);
    const t = template(w / 2, h / 2, d / 2, r);
    const rot = o.rot ?? [0, 0, 0];
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s).premultiply(this.top);
    const nm = new Matrix3().getNormalMatrix(_m);
    _c.set(color as Color);
    if (o.jitter) {
      const k = 1 + (this.rand() - 0.5) * 2 * o.jitter;
      _c.multiplyScalar(k);
    }
    const key = o.mat ?? "matte";
    let part = this.parts.get(key);
    if (!part) {
      part = { p: new Buf(), n: new Buf(), c: new Buf() };
      this.parts.set(key, part);
    }
    for (let i = 0; i < t.p.length; i += 3) {
      _v.set(t.p[i], t.p[i + 1], t.p[i + 2]).applyMatrix4(_m);
      _n.set(t.n[i], t.n[i + 1], t.n[i + 2]).applyMatrix3(nm).normalize();
      part.p.push3(_v.x, _v.y, _v.z);
      part.n.push3(_n.x, _n.y, _n.z);
      part.c.push3(_c.r, _c.g, _c.b);
    }
    this.count++;
  }

  /** Square-section bar from point a to point b (arms, struts, cables). */
  rod(a: V3, b: V3, t: number, color: ColorIn, o: BoxOpts = {}) {
    const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
    const e = new Euler().setFromQuaternion(q);
    this.box([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [t, len, t], color, { ...o, rot: [e.x, e.y, e.z] });
  }

  /** Prism whose axis points along `dir` (lamp shades, nozzles). */
  prismAlong(p: V3, dir: V3, radius: number, height: number, color: ColorIn, o: BoxOpts & { sides?: number } = {}) {
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir).normalize());
    const e = new Euler().setFromQuaternion(q);
    this.prism(p, radius, height, color, { ...o, rot: [e.x, e.y, e.z] });
  }

  /** Axis-aligned box from min corner to max corner. */
  span(a: V3, b: V3, color: ColorIn, o?: BoxOpts) {
    this.box(
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])],
      color,
      o,
    );
  }

  /** Flat-shaded N-sided prism along local Y — tanks, pipes, lenses, wheels. */
  prism(p: V3, radius: number, height: number, color: ColorIn, o: BoxOpts & { sides?: number } = {}) {
    const sides = o.sides ?? 8;
    const rot = o.rot ?? [0, 0, 0];
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s).premultiply(this.top);
    const nm = new Matrix3().getNormalMatrix(_m);
    _c.set(color as Color);
    if (o.jitter) _c.multiplyScalar(1 + (this.rand() - 0.5) * 2 * o.jitter);
    const key = o.mat ?? "matte";
    let part = this.parts.get(key);
    if (!part) {
      part = { p: new Buf(), n: new Buf(), c: new Buf() };
      this.parts.set(key, part);
    }
    const P = part;
    const h = height / 2;
    const ang = (i: number) => (i / sides) * Math.PI * 2 + Math.PI / sides;
    const emit = (pts: number[][], nx: number, ny: number, nz: number) => {
      _n.set(nx, ny, nz).applyMatrix3(nm).normalize();
      for (const q of pts) {
        _v.set(q[0], q[1], q[2]).applyMatrix4(_m);
        P.p.push3(_v.x, _v.y, _v.z);
        P.n.push3(_n.x, _n.y, _n.z);
        P.c.push3(_c.r, _c.g, _c.b);
      }
    };
    for (let i = 0; i < sides; i++) {
      const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2;
      const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
      const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
      const nx = Math.cos(am), nz = Math.sin(am);
      emit([[x0, -h, z0], [x1, h, z1], [x1, -h, z1]], nx, 0, nz);
      emit([[x0, -h, z0], [x0, h, z0], [x1, h, z1]], nx, 0, nz);
      emit([[0, h, 0], [x1, h, z1], [x0, h, z0]], 0, 1, 0);
      emit([[0, -h, 0], [x0, -h, z0], [x1, -h, z1]], 0, -1, 0);
    }
    this.count++;
  }

  build(): [MatKey, BufferGeometry][] {
    return [...this.parts.entries()].map(([k, part]) => {
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(part.p.out(), 3));
      g.setAttribute("normal", new BufferAttribute(part.n.out(), 3));
      g.setAttribute("color", new BufferAttribute(part.c.out(), 3));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return [k, g];
    });
  }
}
