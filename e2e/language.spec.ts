import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('switching to Portuguese updates the page, the title and <html lang>, and persists', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /PT/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sobre');
  await expect(page).toHaveTitle('Sobre · Fold');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sobre');
});

test.describe('a Brazilian Portuguese browser', () => {
  test.use({ locale: 'pt-BR' });
  test('starts in Portuguese', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sobre');
  });
});

test.describe('a French browser', () => {
  test.use({ locale: 'fr-FR' });
  test('starts in English', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
  });
});

test('Portuguese pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/about');
  await page.evaluate(() => localStorage.setItem('fold:lang', 'pt'));
  for (const path of ['/', '/library', '/about', '/fold/fold-in-quarters?step=1']) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  }
});

test('switching language mid-fold keeps the step and scrub position', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  const player = page.locator('main[data-step]');
  await page.getByRole('slider', { name: 'Fold progress' }).fill('40');
  await expect(player).toHaveAttribute('data-progress', '40');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /PT/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('slider', { name: 'Progresso da dobra' })).toBeVisible();
  await expect(player).toHaveAttribute('data-step', '1');
  await expect(player).toHaveAttribute('data-progress', '40');
});
