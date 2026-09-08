import { test, expect } from '@playwright/test';
test('portfolio routes render without overflow', async ({page}) => {
 for (const path of ['/', '/projects/', '/years/', '/years/2022/', '/media/', '/resume/']) {
  await page.goto(path); await expect(page.locator('h1')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('Territories navigation and image loading', async ({page}) => {
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/projects/territories/');await expect(page.locator('.territory-card')).toHaveCount(50);
 await page.locator('#tm-header-btn').click();await expect(page.locator('[data-stop]')).toHaveCount(50);
 await page.keyboard.press('End');await expect(page.locator('#history-position')).toContainText('50 of 50');
 await page.keyboard.press('Escape');await expect(page.locator('#tm-header-btn')).toBeFocused();
 await page.goto('/years/2018/');await page.locator('.story-photo img').first().scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('.story-photo img').first().evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 expect(errors).toEqual([]);
});
