// Config for the audio-only mix render (no video encoder options).
import {Config} from '@remotion/cli/config';

Config.setOverwriteOutput(true);
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setChromiumOpenGlRenderer('swiftshader');
Config.setConcurrency(2);
