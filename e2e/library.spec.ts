import { expect, test } from '@playwright/test';

test('home leads through the library to a model', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start folding' }).click();
  await expect(page).toHaveURL(/\/library$/);

  const models = page.getByRole('list', { name: 'Models' }).getByRole('link');
  await expect(models).toHaveText([/Fold in half/, /Fold in quarters/]);

  await page.getByRole('link', { name: /Fold in half/ }).click();
  await expect(page).toHaveURL(/\/fold\/fold-in-half/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold in half');
});
