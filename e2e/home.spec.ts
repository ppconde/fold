import { expect, test } from '@playwright/test';

test('the start folding link opens the default lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/crane/);
});

test('tapping the page background opens the default lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // wait for hydration before tapping
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(width * 0.75, height * 0.55);
  await expect(page).toHaveURL(/\/fold\/crane/, { timeout: 5000 });
});

test('tapping the menu does not start the lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('Enter on the link works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /start folding/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/fold\/crane/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the model is still and the link navigates at once', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toHaveAttribute('data-motion', 'off');
    await page.getByRole('link', { name: /start folding/ }).click();
    await expect(page).toHaveURL(/\/fold\/crane/);
  });
});

test('if the 3D scene fails to load, the homepage still works', async ({ page }) => {
  await page.route(/\/assets\/HomeScene-[^/]+\.js$/, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold');
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/crane/);
});

test('if models.json cannot be fetched, the homepage still works', async ({ page }) => {
  await page.route(/\/models\/models\.json$/, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold');
  await expect(page.getByRole('link', { name: /start folding/ })).toBeVisible();
});

test('the name stays Fold in Portuguese', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fold:lang', 'pt'));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold');
  await expect(page.getByRole('link', { name: /começar a dobrar/ })).toBeVisible();
});

test.describe('a small phone', () => {
  test.use({ viewport: { width: 360, height: 640 } });
  test('the last line is reachable by scrolling and the model still renders', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /start folding/ });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport();
    const m = page.locator('main');
    expect(await m.evaluate((el) => el.scrollHeight >= el.clientHeight)).toBe(true);
    await expect(page.locator('canvas')).toBeVisible();
  });
});

test('the homepage shows the lesson opened last and unfolds into it', async ({ page }) => {
  await page.goto('/fold/tulip');
  await expect(page.getByRole('heading', { name: 'Tulip' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('img', { name: /^Tulip in paper/ })).toBeVisible();
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/tulip/, { timeout: 6000 });
});

// the stage only reports how far its camera sits once it mounts, after the hand-off has started
test('the sheet lands in the lesson without zooming in first', async ({ page }) => {
  await page.addInitScript(() => {
    const start = Document.prototype.startViewTransition;
    Document.prototype.startViewTransition = function (...args) {
      const transition = start.apply(this, args);
      transition.ready.then(() => {
        // where the sheet is headed, read the moment the hand-off starts
        const lands = document.getAnimations().find((a) => (a as CSSAnimation).animationName === 'paper-lands');
        if (!lands) return;
        lands.pause();
        lands.currentTime = 550;
        const height = (pseudo: string) => parseFloat(getComputedStyle(document.documentElement, pseudo).height);
        (window as unknown as { growth: number }).growth =
          height('::view-transition-old(paper)') / height('::view-transition-group(paper)');
        lands.play();
      });
      return transition;
    };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(width * 0.75, height * 0.55);
  const growth = await page.waitForFunction(() => (window as unknown as { growth?: number }).growth, null, {
    timeout: 8000
  });
  expect(await growth.jsonValue()).toBeLessThan(1.5);
});
