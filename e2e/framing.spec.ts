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

/** Share of pixels that differ between two screenshots of the 3D view. */
async function difference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([a, b]) => {
      const pixels = async (src: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${src}`;
        await img.decode();
        const c = document.createElement('canvas');
        [c.width, c.height] = [img.width, img.height];
        const g = c.getContext('2d') as CanvasRenderingContext2D;
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const [p, q] = [await pixels(a), await pixels(b)];
      let n = 0;
      for (let i = 0; i < p.length; i += 4) n += +(Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) > 30);
      return n / (p.length / 4);
    },
    [a.toString('base64'), b.toString('base64')]
  );
}

test('replaying a step leaves a camera the reader has moved where it is', async ({ page }) => {
  await page.goto('/fold/tulip?step=3');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(600); // the camera eases into place
  const framed = await canvas.screenshot();

  // orbit, then zoom out
  const box = (await canvas.boundingBox()) as { x: number; y: number; width: number; height: number };
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y - 60, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  const moved = await canvas.screenshot();
  expect(await difference(page, framed, moved)).toBeGreaterThan(0.05);

  await page.getByRole('button', { name: 'Replay step' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('main')).not.toHaveAttribute('data-state', 'playing', { timeout: 10000 });
  await page.waitForTimeout(800);
  expect(await difference(page, moved, await canvas.screenshot())).toBeLessThan(0.03);
});

test('Reset view undoes a trackpad pinch as well as an orbit', async ({ page }) => {
  await page.goto('/fold/tulip?step=3');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(600); // the camera eases into place
  const framed = await canvas.screenshot();

  // a macOS trackpad pinch arrives as a wheel with ctrl held
  const box = (await canvas.boundingBox()) as { x: number; y: number; width: number; height: number };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down('Control');
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -60);
  await page.keyboard.up('Control');
  await page.waitForTimeout(800);
  expect(await difference(page, framed, await canvas.screenshot())).toBeGreaterThan(0.05);

  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.waitForTimeout(1200);
  expect(await difference(page, framed, await canvas.screenshot())).toBeLessThan(0.01);
});

test('the view tumbles over the top, and Reset view sets it upright again', async ({ page }) => {
  // CI renders in software, where every frame of a drag is slow
  test.setTimeout(90_000);
  await page.goto('/fold/tulip?step=3');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(600); // the camera eases into place
  const framed = await canvas.screenshot();

  // drags of a quarter turn each: an orbit clamped at the pole stops changing after the second
  const box = (await canvas.boundingBox()) as { x: number; y: number; width: number; height: number };
  const x = box.x + box.width / 2;
  const turn = async () => {
    await page.mouse.move(x, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(x, box.y + box.height * 0.55, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(800);
  };
  await turn();
  await turn();
  const overTop = await canvas.screenshot();
  await turn();
  expect(await difference(page, overTop, await canvas.screenshot())).toBeGreaterThan(0.01);

  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.waitForTimeout(1500);
  expect(await difference(page, framed, await canvas.screenshot())).toBeLessThan(0.01);
});
