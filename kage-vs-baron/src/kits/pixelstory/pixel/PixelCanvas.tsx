import React, { useLayoutEffect, useRef } from "react";

type Props = {
  /** Art-pixel width and height of the buffer. */
  w: number;
  h: number;
  /** RGBA buffer, w*h*4. */
  pixels: Uint8ClampedArray;
  /** Screen pixels per art pixel. */
  scale: number;
  style?: React.CSSProperties;
};

/**
 * Draws an RGBA buffer at native art resolution and lets the compositor scale it with
 * nearest-neighbour sampling, so pixels stay hard at any camera zoom.
 */
export const PixelCanvas: React.FC<Props> = ({ w, h, pixels, scale, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = new ImageData(w, h);
    img.data.set(pixels);
    ctx.putImageData(img, 0, 0);
  }, [w, h, pixels]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{
        width: w * scale,
        height: h * scale,
        imageRendering: "pixelated",
        display: "block",
        ...style,
      }}
    />
  );
};
