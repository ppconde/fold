import { expect, test } from '@playwright/test';

test('an unknown model id shows Model not found with a way back', async ({ page }) => {
  await page.goto('/fold/crane-that-does-not-exist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Model not found');
  await page.getByRole('link', { name: 'Browse the library' }).click();
  await expect(page).toHaveURL(/\/library$/);
});

test('each page has its own title', async ({ page }) => {
  const titles: [string, string][] = [
    ['/', 'Fold'],
    ['/library', 'Library · Fold'],
    ['/about', 'About · Fold'],
    ['/editor', 'Editor · Fold'],
    ['/fold/fold-in-half', 'Fold in half · Fold']
  ];
  for (const [path, title] of titles) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }
});

test('focus moves to the new page heading after navigating', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('focus lands on the model heading after navigating to a page that loads data', async ({ page }) => {
  await page.goto('/fold/fold-in-half');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold in half');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
