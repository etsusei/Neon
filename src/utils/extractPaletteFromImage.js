import * as THREE from 'three';

function luminance(color) {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

function isDistinctColor(color, palette, minDistance) {
  for (let existing of palette) {
    const dr = existing.r - color.r;
    const dg = existing.g - color.g;
    const db = existing.b - color.b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) < minDistance) {
      return false;
    }
  }
  return true;
}

function fillPalette(palette, targetCount) {
  while (palette.length < targetCount) {
    if (palette.length > 0) {
      const sourceIndex = palette.length % palette.length;
      const lightnessShift = (palette.length % 2 === 0) ? 0.05 : -0.05;
      palette.push(palette[sourceIndex].clone().offsetHSL(0, 0, lightnessShift));
    } else {
      palette.push(new THREE.Color(0x333333));
    }
  }
  return palette;
}

export function extractPaletteFromImage(image, options = {}) {
  const {
    sampleSize = 64,
    quantization = 32,
    targetCount = 6,
    minPixelRatio = 0.03,
    minDistance = 0.15,
    minBrightness = 15,
    maxBrightness = 720,
    maxLuminanceOutlierDistance = 0.45
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const colorCounts = {};
  let totalValidPixels = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = Math.floor(imageData[i] / quantization) * quantization;
    const g = Math.floor(imageData[i + 1] / quantization) * quantization;
    const b = Math.floor(imageData[i + 2] / quantization) * quantization;
    const brightness = r + g + b;

    if (brightness < minBrightness || brightness > maxBrightness) continue;

    totalValidPixels++;
    const key = `${r},${g},${b}`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }

  const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  const minPixelCount = Math.max(totalValidPixels * minPixelRatio, 1);
  const palette = [];

  for (let [key, count] of sortedColors) {
    if (palette.length >= targetCount) break;
    if (count < minPixelCount) continue;

    const [r, g, b] = key.split(',').map(Number);
    const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);

    if (palette.length >= 2) {
      const avgLum = palette.map(luminance).reduce((a, b) => a + b, 0) / palette.length;
      if (Math.abs(luminance(color) - avgLum) > maxLuminanceOutlierDistance) continue;
    }

    if (isDistinctColor(color, palette, minDistance)) {
      palette.push(color);
    }
  }

  return fillPalette(palette, targetCount);
}

export function getAverageLuminance(colors) {
  if (!colors.length) return 0;
  return colors.map(luminance).reduce((a, b) => a + b, 0) / colors.length;
}
