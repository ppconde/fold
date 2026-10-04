import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: 'Fold' },
  { path: '/library', heading: 'Library' },
  { path: '/fold/fold-in-half', heading: 'fold-in-half' },
  { path: '/editor', heading: 'Editor' },
  { path: '/about', heading: 'About' }
];

for (const { path, heading } of pages) {
  test(`${path} loads and has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('menu navigates between pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('menu works with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

for (const path of ['/nope', '/fold']) {
  test(`${path} shows page not found with a way back`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await page.getByRole('link', { name: 'Browse the library' }).click();
    await expect(page).toHaveURL(/\/library$/);
  });
}

test('text size persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Larger text' }).click();
  await page.reload();
  const scale = await page.evaluate(() => document.documentElement.style.getPropertyValue('--text-scale'));
  expect(scale).toBe('1.3');
});

test('menu button does not overlap the heading', async ({ page }) => {
  await page.goto('/about');
  const button = await page.getByRole('button', { name: 'Menu' }).boundingBox();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  if (!button || !heading) throw new Error('missing element');
  expect(button.y + button.height).toBeLessThanOrEqual(heading.y);
});
