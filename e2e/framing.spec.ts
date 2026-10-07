import { expect, type Page, test } from '@playwright/test';

/** Paper-coloured pixels in a 2px strip along each edge of the 3D view (the page background is plaster). */
async function edgeHits(page: Page) {
  const png = (await page.locator('canvas').screenshot()).toString('base64');
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = document.createElement('canvas');
    [c.width, c.height] = [img.width, img.height];
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const paper = (x: number, y: number) => {
      const i = (y * c.width + x) * 4;
      return Math.max(Math.abs(d[i] - 226), Math.abs(d[i + 1] - 216), Math.abs(d[i + 2] - 200)) > 45;
    };
    let hits = 0;
    for (let x = 0; x < c.width; x++) for (const y of [0, 1, c.height - 2, c.height - 1]) hits += +paper(x, y);
    for (let y = 0; y < c.height; y++) for (const x of [0, 1, c.width - 2, c.width - 1]) hits += +paper(x, y);
    return hits;
  }, png);
}

test.describe('on a short phone (an iPhone SE under Safari toolbars)', () => {
  test.use({ viewport: { width: 375, height: 548 } });

  test('the paper stays inside the 3D view at rest and mid-fold, turn-over included', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    for (const [step, progress] of [
      [0, null],
      [1, '50'],
      [1, null],
      [2, '50']
    ] as const) {
      await page.goto(`/fold/dog-face?step=${step}`);
      await expect(page.locator('canvas')).toBeVisible();
      if (progress) await page.getByRole('slider', { name: 'Fold progress' }).fill(progress);
      await page.waitForTimeout(600); // the camera eases into place
      expect(await edgeHits(page), `step ${step} at ${progress ?? '100'}%`).toBe(0);
    }
  });
});

test.describe('on a phone held sideways', () => {
  test.use({ viewport: { width: 667, height: 375 } });

  test('the 3D view keeps at least half the height', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await page.goto('/fold/dog-face?step=6');
    const box = await page.locator('canvas').boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(375 * 0.5);
  });
});
