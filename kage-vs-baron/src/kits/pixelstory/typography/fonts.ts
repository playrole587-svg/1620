import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// Bundled OFL fonts (licences in public/fonts/licenses). Loaded through the FontFace
// API and held with delayRender so no frame is ever captured with a fallback face.

export const FONT = {
  display: "PS Anton",
  serif: "PS Instrument Serif",
  pixel: "PS Silkscreen",
  sans: "PS Space Grotesk",
} as const;

const FACES: [string, string, FontFaceDescriptors][] = [
  [FONT.display, "fonts/Anton-Regular.ttf", {}],
  [FONT.serif, "fonts/InstrumentSerif-Italic.ttf", { style: "italic" }],
  [FONT.serif, "fonts/InstrumentSerif-Regular.ttf", { style: "normal" }],
  [FONT.pixel, "fonts/Silkscreen-Regular.ttf", { weight: "400" }],
  [FONT.pixel, "fonts/Silkscreen-Bold.ttf", { weight: "700" }],
  [FONT.sans, "fonts/SpaceGrotesk-Variable.ttf", { weight: "300 700" }],
];

let loading: Promise<void> | null = null;
const loadAll = () =>
  (loading ??= Promise.all(
    FACES.map(([family, file, desc]) =>
      new FontFace(family, `url(${staticFile(file)})`, desc).load().then((f) => {
        (document.fonts as unknown as { add(face: FontFace): void }).add(f);
      }),
    ),
  ).then(() => undefined));

export const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    loadAll()
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
};
