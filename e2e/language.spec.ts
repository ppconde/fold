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
    await page.emulateMedia({ reducedMotion: 'reduce' }); // axe must not sample a mid-fade
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  }
});

test('switching language mid-lesson keeps the step, the scrub and the panel', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=2');
  await page.getByRole('slider', { name: 'Fold progress' }).fill('40');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /PT/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Dobra a metade de cima para baixo, sobre a metade de baixo.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dobrar em quatro');
  await expect(page.locator('main')).toHaveAttribute('data-step', '2');
  await expect(page.locator('main')).toHaveAttribute('data-progress', '40');
  await expect(page.getByRole('complementary', { name: 'Instruções' })).toBeVisible();
});
