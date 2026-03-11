import fs from "fs";
import { PNG } from "pngjs";

// Read original green texture
const src = PNG.sync.read(fs.readFileSync("public/models/T_pixelTank.png"));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Target hues for each team color:
// Red (0xff4444) -> hue ~0
// Blue (0x4488ff) -> hue ~216
// Yellow (0xffff44) -> hue ~60
// Green (original) -> hue ~120

const variants = [
  { name: "T_pixelTank_red.png", targetHue: 0, satMult: 1.0, lightMult: 1.0 },
  { name: "T_pixelTank_blue.png", targetHue: 195, satMult: 1.0, lightMult: 2.0, lightMin: 0.35 },
  { name: "T_pixelTank_yellow.png", targetHue: 50, satMult: 1.4, lightMult: 1.5, lightMin: 0.3 },
];

for (const variant of variants) {
  const out = new PNG({ width: src.width, height: src.height });

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (y * src.width + x) * 4;
      const r = src.data[idx];
      const g = src.data[idx + 1];
      const b = src.data[idx + 2];
      const a = src.data[idx + 3];

      const [h, s, l] = rgbToHsl(r, g, b);

      // Only shift pixels that are "green-ish" (hue 60-180, with some saturation)
      if (s > 0.1 && h >= 60 && h <= 180) {
        const newHue = variant.targetHue; // absolute hue replacement
        const newSat = Math.min(1, s * (variant.satMult || 1));
        const newLight = Math.min(0.95, Math.max(variant.lightMin || 0, l * (variant.lightMult || 1)));
        const [nr, ng, nb] = hslToRgb(((newHue % 360) + 360) % 360, newSat, newLight);
        out.data[idx] = nr;
        out.data[idx + 1] = ng;
        out.data[idx + 2] = nb;
      } else {
        out.data[idx] = r;
        out.data[idx + 1] = g;
        out.data[idx + 2] = b;
      }
      out.data[idx + 3] = a;
    }
  }

  fs.writeFileSync(`public/models/${variant.name}`, PNG.sync.write(out));
  console.log(`Created ${variant.name}`);
}

// Also copy original as the green variant for consistency
fs.copyFileSync("public/models/T_pixelTank.png", "public/models/T_pixelTank_green.png");
console.log("Copied T_pixelTank_green.png");
