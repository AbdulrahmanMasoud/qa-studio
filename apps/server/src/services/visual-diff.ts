import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { existsSync, mkdirSync } from 'fs';

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export interface DiffResult {
  diffPercentage: number;
  diffImagePath: string;
  matches: boolean;
}

/**
 * Pad a PNG to the target dimensions by adding transparent pixels.
 * Returns a new PNG with the target width/height.
 */
function padToSize(img: PNG, targetWidth: number, targetHeight: number): PNG {
  if (img.width === targetWidth && img.height === targetHeight) return img;

  const padded = new PNG({ width: targetWidth, height: targetHeight, fill: true });
  // Fill with transparent white so extra area counts as a diff
  for (let i = 0; i < padded.data.length; i += 4) {
    padded.data[i] = 255;     // R
    padded.data[i + 1] = 255; // G
    padded.data[i + 2] = 255; // B
    padded.data[i + 3] = 255; // A
  }
  // Copy original image data row by row
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      padded.data[dstIdx] = img.data[srcIdx];
      padded.data[dstIdx + 1] = img.data[srcIdx + 1];
      padded.data[dstIdx + 2] = img.data[srcIdx + 2];
      padded.data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return padded;
}

export function compareScreenshots(
  baselinePath: string,
  actualPath: string,
  outputDir: string,
  threshold = 5
): DiffResult {
  ensureDir(outputDir);

  let baselineImg: PNG = PNG.sync.read(readFileSync(baselinePath));
  let actualImg: PNG = PNG.sync.read(readFileSync(actualPath));

  // If dimensions differ, pad the smaller image to match the larger
  const width = Math.max(baselineImg.width, actualImg.width);
  const height = Math.max(baselineImg.height, actualImg.height);

  baselineImg = padToSize(baselineImg, width, height);
  actualImg = padToSize(actualImg, width, height);

  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    baselineImg.data,
    actualImg.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffPercentage = Math.round((numDiffPixels / totalPixels) * 10000) / 100;

  const diffImagePath = join(outputDir, `diff-${Date.now()}.png`);
  writeFileSync(diffImagePath, PNG.sync.write(diff));

  return {
    diffPercentage,
    diffImagePath,
    matches: diffPercentage <= threshold,
  };
}
