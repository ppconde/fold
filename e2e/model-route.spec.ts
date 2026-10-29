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
    ['/fold/tulip', 'Tulip · Fold']
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
  await page.goto('/fold/tulip');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tulip');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('a model names the base it starts from and links to it', async ({ page }) => {
  await page.goto('/fold/crane');
  await page.getByRole('link', { name: 'Square base' }).click();
  await expect(page).toHaveURL(/\/fold\/square-base/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Square base');
  await expect(page.getByText('Starts from:')).toHaveCount(0);
});
