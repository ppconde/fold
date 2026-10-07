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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold, slowly.');
  await page.getByRole('link', { name: /start folding/ }).click();
  await expect(page).toHaveURL(/\/fold\/fold-in-quarters/);
});
