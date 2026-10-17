import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const openPicker = (page: Page) => page.getByRole('button', { name: /^Paper:/ }).click();

test('picks a paper, keeps it on reload and on another model', async ({ page }) => {
  await page.goto('/fold/tulip');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'plain');
  await page.getByRole('button', { name: 'Paper: Plain' }).click();
  await page.getByRole('radio', { name: 'Ichimatsu' }).check();
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
  await expect(page.getByRole('button', { name: 'Paper: Ichimatsu' })).toBeVisible();
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
  await page.goto('/fold/crane');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
});

test('an unknown stored paper falls back to plain', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fold:paper', 'gone'));
  await page.goto('/fold/tulip');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'plain');
});

test('arrow keys on a swatch change the paper, not the step', async ({ page }) => {
  await page.goto('/fold/tulip?step=1');
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await openPicker(page);
  await page.getByRole('radio', { name: 'Plain' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press(' ');
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await expect(page.locator('main')).not.toHaveAttribute('data-state', 'playing');
});

test('switching paper mid-fold keeps the fold playing', async ({ page }) => {
  await page.goto('/fold/crane?step=3');
  await page.getByRole('button', { name: 'Replay step' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'playing');
  await openPicker(page);
  await page.getByRole('radio', { name: 'Ichimatsu' }).check();
  await expect(page.locator('main')).toHaveAttribute('data-step', '3');
  await expect(page.locator('main')).not.toHaveAttribute('data-state', 'playing', { timeout: 15_000 });
  await expect(page.locator('main')).toHaveAttribute('data-step', '3');
});

test('every paper compiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
  });
  await page.goto('/fold/crane?step=5');
  await openPicker(page);
  for (const radio of await page.getByRole('radio').all()) {
    await radio.check();
    // two frames, so the material compiles and draws
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  expect(errors.filter((e) => /Shader Error|WebGLProgram|paper pattern/.test(e))).toEqual([]);
});

test('the open picker passes axe', async ({ page }) => {
  await page.goto('/fold/tulip');
  await openPicker(page);
  await expect(page.getByRole('radio', { name: 'Plain' })).toBeChecked();
  // the picker only: the dock hint's contrast is its own, older story
  const { violations } = await new AxeBuilder({ page }).include('[popover]').analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
