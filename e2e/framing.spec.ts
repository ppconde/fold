import { expect, type Page, test } from '@playwright/test';

/**
 * Paper-coloured pixels in a 2px strip along each edge of the 3D view (the page background is plaster), and the
 * share of the view's width the paper spans.
 */
async function measure(page: Page) {
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
    const columns = Array.from({ length: c.width }, (_, x) => x).filter((x) =>
      Array.from({ length: c.height }, (_, y) => y).some((y) => paper(x, y))
    );
    return { hits, span: columns.length ? (columns[columns.length - 1] - columns[0]) / c.width : 0 };
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
      expect((await measure(page)).hits, `step ${step} at ${progress ?? '100'}%`).toBe(0);
    }
  });
});

test.describe('on a tall phone', () => {
  test.use({ viewport: { width: 412, height: 839 } });

  // the camera closes in on the settled model, not on room for the step it came from
  test('a folded model at rest spans three quarters of the width', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await page.goto('/fold/tulip?step=3');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(600); // the camera eases into place
    expect((await measure(page)).span).toBeGreaterThan(0.75);
  });
});

test.describe('on a phone held sideways', () => {
  test.use({ viewport: { width: 667, height: 375 } });

  test('the 3D view keeps at least half the height', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await page.goto('/fold/dog-face?step=6');
    // polled: the canvas starts at its default 150px until the 3D view sizes it
    await expect.poll(async () => (await page.locator('canvas').boundingBox())?.height ?? 0).toBeGreaterThan(375 * 0.5);
  });
});
