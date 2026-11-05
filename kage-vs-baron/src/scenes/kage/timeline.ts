// One source of truth for the film's beats. Times are SECONDS on the film clock; the film (React) and the
// sound design (scripts/make-audio.py, through scripts/dump-timeline.mjs) both read this file.

export const FPS = 60;
export const DURATION = 20;
export const s = (sec: number) => Math.round(sec * FPS);

export type Hit = { t: number; x: number; y: number; size: number; kind: "punch" | "kick" | "heavy" | "slash"; dmg: number; to: "baron" | "kage"; shake: number };

/** Impact beats: spark position (set coordinates), damage dealt, camera shake. */
export const HITS: Hit[] = [
  { t: 3.05, x: 87, y: 160, size: 8, kind: "punch", dmg: 10, to: "baron", shake: 6 },
  { t: 3.4, x: 88, y: 157, size: 9, kind: "punch", dmg: 10, to: "baron", shake: 8 },
  { t: 3.77, x: 93, y: 175, size: 10, kind: "kick", dmg: 14, to: "baron", shake: 10 },
  { t: 4.19, x: 91, y: 163, size: 14, kind: "kick", dmg: 18, to: "baron", shake: 18 },
  { t: 4.88, x: 72, y: 160, size: 17, kind: "heavy", dmg: 55, to: "kage", shake: 28 },
];

export const T = {
  fadeIn: 0.0,
  roundText: 0.55,
  fightText: 1.75,
  fightGone: 2.9,
  advance: 2.45,
  baronWind: 4.3,
  kageFlung: 4.95,
  kageLands: 5.55,
  eyesIn: 6.15,
  eyesOut: 7.1,
  baronSlam: 7.2,
  vanish: 7.24,
  eclipseStart: 7.2,
  eclipseFull: 7.95,
  banner: 7.45,
  leap: 7.75,
  apex: 8.1,
  dive: 8.68,
  strike: 9.15,
  slashes: [9.3, 9.42, 9.54] as number[],
  sheath: 9.62,
  shatter: 9.78,
  fallStart: 9.78,
  thud: 11.0,
  ko: 11.25,
  koEnd: 13.4,
  eclipseEnd: 13.0,
  turn: 12.4,
  victoryPose: 13.2,
  wins: 14.2,
  logo: 16.6,
  fadeOut: 19.35,
};

/** Footstep, whoosh and other non-impact beats for the sound department. */
export const SFX_EXTRA: { t: number; name: string; v?: number }[] = [
  { t: 0.55, name: "gong", v: 0.8 },
  { t: 1.75, name: "gongBig", v: 1 },
  { t: 2.55, name: "step" }, { t: 2.67, name: "step" }, { t: 2.79, name: "step" }, { t: 2.91, name: "step" },
  { t: 2.96, name: "whoosh", v: 0.5 },
  { t: 3.3, name: "whoosh", v: 0.5 },
  { t: 3.66, name: "whoosh", v: 0.6 },
  { t: 4.08, name: "whoosh", v: 0.8 },
  { t: 4.6, name: "windup", v: 0.9 },
  { t: 4.74, name: "whoosh", v: 1 },
  { t: 5.45, name: "thud", v: 0.8 },
  { t: 5.7, name: "slide", v: 0.8 },
  { t: 6.0, name: "heartbeat", v: 0.9 },
  { t: 6.35, name: "eyeFlash", v: 1 },
  { t: 6.9, name: "step", v: 1.2 }, { t: 6.62, name: "step", v: 1.2 }, { t: 6.34, name: "step", v: 1.2 },
  { t: 7.2, name: "slam", v: 1 },
  { t: 7.26, name: "smoke", v: 1 },
  { t: 7.2, name: "eclipse", v: 1 },
  { t: 7.75, name: "leap", v: 1 },
  { t: 8.68, name: "dive", v: 1 },
  { t: 9.15, name: "strikeHit", v: 1 },
  { t: 9.3, name: "slashTing", v: 1 },
  { t: 9.42, name: "slashTing", v: 1 },
  { t: 9.54, name: "slashTing", v: 1 },
  { t: 9.62, name: "sheath", v: 1 },
  { t: 9.78, name: "shatter", v: 1 },
  { t: 10.0, name: "debris", v: 0.8 },
  { t: 11.0, name: "bodyfall", v: 1 },
  { t: 11.25, name: "ko", v: 1 },
  { t: 13.0, name: "moonReturn", v: 1 },
  { t: 14.2, name: "winChime", v: 1 },
  { t: 16.6, name: "logoHit", v: 1 },
];
