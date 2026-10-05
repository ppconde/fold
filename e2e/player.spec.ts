import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const settled = (page: Page) =>
  expect(page.locator('main')).not.toHaveAttribute('data-state', 'playing', { timeout: 15_000 });

async function next(page: Page) {
  await page.getByRole('button', { name: 'Next step' }).click();
  await settled(page);
}

test('steps forward and back, keeping the URL in sync', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await next(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await expect(page).toHaveURL(/step=1/);
  await expect(page.getByText('Fold the left half over onto the right half.')).toBeVisible();
  await page.getByRole('button', { name: 'Previous step' }).click();
  await settled(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await expect(page).toHaveURL(/step=0/);
});

test('a reload resumes the step from the URL, and bad steps are clamped', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await page.goto('/fold/fold-in-quarters?step=99');
  await expect(page.locator('main')).toHaveAttribute('data-step', '2');
  await page.goto('/fold/fold-in-quarters?step=abc');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
});

test('keyboard: arrows step, space replays, and the open menu takes keys away from the player', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await page.keyboard.press('ArrowRight');
  await settled(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await page.keyboard.press('Space');
  await expect(page.locator('main')).toHaveAttribute('data-state', 'playing');
  await settled(page);
  await page.keyboard.press('ArrowLeft');
  await settled(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
});

test('finishing shows the completion card, and Fold again starts over', async ({ page }) => {
  await page.goto('/fold/fold-in-half');
  await next(page);
  await expect(page.locator('main')).toHaveAttribute('data-state', 'done');
  await expect(page.getByText('Well folded!')).toBeVisible();
  await page.getByRole('button', { name: 'Fold again' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await expect(page.getByRole('link', { name: 'Back to library' })).toBeHidden();
});

test('the instructions can be hidden and shown, and the choice survives a reload', async ({ page }) => {
  await page.goto('/fold/fold-in-half');
  await expect(page.getByRole('complementary', { name: 'Instructions' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide steps' }).click();
  await expect(page.getByRole('complementary', { name: 'Instructions' })).toBeHidden();
  await expect(page.getByText('0 / 1')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('complementary', { name: 'Instructions' })).toBeHidden();
  await page.getByRole('button', { name: 'Show steps' }).click();
  await expect(page.getByRole('complementary', { name: 'Instructions' })).toBeVisible();
});

test('the dock, the instructions and the title never overlap', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  const box = async (name: string) => {
    const b = await page.locator(name).boundingBox();
    if (!b) throw new Error(`${name} not visible`);
    return b;
  };
  const dock = await box('[data-testid="dock"]');
  const panel = await box('aside');
  const title = await box('main h1');
  const menu = await page.getByRole('button', { name: 'Menu' }).boundingBox();
  const apart = (a: typeof dock, b: typeof dock) =>
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
  expect(apart(dock, panel)).toBe(true);
  expect(apart(title, panel)).toBe(true);
  if (menu) expect(apart(menu, title)).toBe(true);
});

test('the player has no serious accessibility violations', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('without WebGL the diagram and instructions still work', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/fold/fold-in-half');
  await expect(page.getByText("The 3D view isn't available on this device.")).toBeVisible();
  await expect(page.getByRole('img', { name: /Crease pattern/ })).toBeVisible();
  await next(page);
  await expect(page.locator('main')).toHaveAttribute('data-state', 'done');
});
