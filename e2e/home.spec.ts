import { expect, test } from '@playwright/test';

test('the start folding link opens the default lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/fold-in-quarters/);
});

test('tapping the page background opens the default lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // wait for hydration before tapping
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(width * 0.75, height * 0.55);
  await expect(page).toHaveURL(/\/fold\/fold-in-quarters/, { timeout: 5000 });
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
  await expect(page).toHaveURL(/\/fold\/fold-in-quarters/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the crane is still and the link navigates at once', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toHaveAttribute('data-motion', 'off');
    await page.getByRole('link', { name: /start folding/ }).click();
    await expect(page).toHaveURL(/\/fold\/fold-in-quarters/);
  });
});

test('if the crane fails to load, the homepage still works', async ({ page }) => {
  await page.route(/\/assets\/CraneScene-[^/]+\.js$/, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold');
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/fold-in-quarters/);
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
  test('the last line is reachable by scrolling and the crane still renders', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /start folding/ });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport();
    const m = page.locator('main');
    expect(await m.evaluate((el) => el.scrollHeight >= el.clientHeight)).toBe(true);
    await expect(page.locator('canvas')).toBeVisible();
  });
});
