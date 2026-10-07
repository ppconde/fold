import { expect, test } from '@playwright/test';

test('home leads through the library to a model', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/library$/);

  const models = page.getByRole('list', { name: 'Models' }).getByRole('link');
  await expect(models).toHaveText([/Dog face/, /Tulip/, /Fold in half/, /Fold in quarters/]);

  await page.getByRole('link', { name: /Fold in half/ }).click();
  await expect(page).toHaveURL(/\/fold\/fold-in-half/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold in half');
});

test('search narrows the cards, ignoring case and accents', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('searchbox', { name: 'Search folds' }).fill('DOG');
  const models = page.getByRole('list', { name: 'Models' }).getByRole('link');
  await expect(models).toHaveText([/Dog face/]);
  await expect(page).toHaveURL(/q=DOG/);

  await page.getByRole('searchbox', { name: 'Search folds' }).fill('túlipa');
  await expect(models).toHaveText([/Tulip/]);
});

test('filters update the URL and the cards, and survive a reload', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'Flowers' }).click();
  await expect(page).toHaveURL(/cat=flowers/);
  const models = page.getByRole('list', { name: 'Models' }).getByRole('link');
  await expect(models).toHaveText([/Tulip/]);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Flowers' })).toHaveAttribute('aria-pressed', 'true');
  await expect(models).toHaveText([/Tulip/]);

  await page.getByRole('button', { name: 'All' }).click();
  await expect(models).toHaveCount(4);
});

test('an empty result offers to clear the filters', async ({ page }) => {
  await page.goto('/library?cat=animals&diff=hard');
  await expect(page.getByText('No folds match.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole('list', { name: 'Models' }).getByRole('link')).toHaveCount(4);
});

test('a bad search param falls back to the full library', async ({ page }) => {
  await page.goto('/library?cat=cars&diff=7');
  await expect(page.getByRole('list', { name: 'Models' }).getByRole('link')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
});

test('a card shows its thumbnail and opens the player', async ({ page }) => {
  await page.goto('/library');
  const card = page.getByRole('link', { name: /Tulip/ });
  await expect(card.locator('img')).toHaveAttribute('src', '/models/tulip.svg');
  await card.click();
  await expect(page).toHaveURL(/\/fold\/tulip/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tulip');
});

test('typing a two-word query keeps the space', async ({ page }) => {
  await page.goto('/library');
  const box = page.getByRole('searchbox', { name: 'Search folds' });
  await box.pressSequentially('dog face');
  await expect(box).toHaveValue('dog face');
  await expect(page.getByRole('list', { name: 'Models' }).getByRole('link')).toHaveText([/Dog face/]);
});

test('cards and filters follow the language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fold:lang', 'pt'));
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /Túlipa/ })).toBeVisible();
  await page.getByRole('button', { name: 'Flores' }).click();
  await expect(page.getByRole('list', { name: 'Modelos' }).getByRole('link')).toHaveText([/Túlipa/]);
});

test('a model without a thumbnail shows the paper placeholder', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /Fold in half/ }).locator('img')).toHaveCount(0);
});
