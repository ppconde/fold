import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: 'Fold' },
  { path: '/library', heading: 'Library' },
  { path: '/fold/fold-in-half', heading: 'Fold in half' },
  { path: '/about', heading: 'About' }
];

for (const { path, heading } of pages) {
  test(`${path} loads and has no serious accessibility violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // axe must not sample a mid-fade
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

test('the menu offers the language but no text size', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Text size' })).toHaveCount(0);
});

test('menu button does not overlap the heading', async ({ page }) => {
  await page.goto('/about');
  const button = await page.getByRole('button', { name: 'Menu' }).boundingBox();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  if (!button || !heading) throw new Error('missing element');
  expect(button.y + button.height).toBeLessThanOrEqual(heading.y);
});

test('focus ring is visible inside the dark menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineColor);
  expect(outline).toBe('rgb(79, 97, 119)');
});

test('tapping the backdrop closes the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(width - 10, height / 2);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the menu sits in a bar across the top that wears the page texture', async ({ page }) => {
  await page.goto('/library');
  await expect(page.locator('img').first()).toBeVisible();
  const top = await page.evaluate(() => {
    const hit = document.elementFromPoint(window.innerWidth / 2, 20);
    const bg = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo).backgroundImage;
    return {
      inHeader: !!hit?.closest('header'),
      same: bg(document.querySelector('header') ?? document.body) === bg(document.body, '::before')
    };
  });
  expect(top).toEqual({ inHeader: true, same: true });
});
