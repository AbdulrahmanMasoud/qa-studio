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

export function compareScreenshots(
  baselinePath: string,
  actualPath: string,
  outputDir: string,
  threshold = 5
): DiffResult {
  ensureDir(outputDir);

  const baselineImg = PNG.sync.read(readFileSync(baselinePath));
  const actualImg = PNG.sync.read(readFileSync(actualPath));

  const { width, height } = baselineImg;
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
