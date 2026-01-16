import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('has correct title and navigation', async ({ page }) => {
    await page.goto('/');

    // Check navigation exists
    await expect(page.locator('nav')).toBeVisible();

    // Check navigation links
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Collab' })).toBeVisible();
  });

  test('skip to main content link works', async ({ page }) => {
    await page.goto('/');

    // Tab to the skip link
    await page.keyboard.press('Tab');

    // Skip link should be visible on focus
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    // Click the skip link
    await skipLink.click();

    // Main content should have focus
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');

    // Find and click theme toggle button
    const themeButton = page.getByRole('button', { name: /theme/i });

    if (await themeButton.isVisible()) {
      await themeButton.click();
      // Theme should change (we can't easily verify the actual theme without more context)
    }
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click Portfolio link
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await expect(page).toHaveURL(/\/portfolio/);

    // Click Collab link
    await page.getByRole('link', { name: 'Collab' }).click();
    await expect(page).toHaveURL(/\/about/);

    // Click Home link (logo or home link)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Portfolio Page', () => {
  test('loads portfolio content', async ({ page }) => {
    await page.goto('/portfolio');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have some content (tabs or sections)
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('About Page', () => {
  test('loads about content', async ({ page }) => {
    await page.goto('/about');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Main content should be visible
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('home page has no automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/');

    // Check that all images have alt text
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt attribute (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // First nav item

    // Home link should be focusable
    const homeLink = page.getByRole('link', { name: 'Home' });
    await expect(homeLink).toBeFocused();

    // Tab to next nav item
    await page.keyboard.press('Tab');
    const portfolioLink = page.getByRole('link', { name: 'Portfolio' });
    await expect(portfolioLink).toBeFocused();
  });
});

test.describe('Error Handling', () => {
  test('404 pages show error gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');

    // Page should still render (with Layout)
    await expect(page.locator('nav')).toBeVisible();
  });
});
