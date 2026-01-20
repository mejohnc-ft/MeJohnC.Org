# End-to-End (E2E) Testing Guide

This document provides comprehensive guidance for implementing, maintaining, and running end-to-end tests for MeJohnC.Org.

## Overview

End-to-end testing validates the entire application flow from the user's perspective, ensuring all components work together correctly. E2E tests simulate real user interactions with the application, testing critical user journeys and catching integration issues that unit tests cannot detect.

### Why E2E Testing?

- **User-centric validation**: Tests the application as users experience it
- **Integration verification**: Ensures frontend, backend, and third-party services work together
- **Regression prevention**: Catches breaking changes before deployment
- **Cross-browser compatibility**: Validates functionality across different browsers
- **Confidence for deployment**: Provides assurance that critical flows work correctly

### Testing Pyramid

```
        /\
       /  \      E2E Tests (fewer, slower, high confidence)
      /----\
     /      \    Integration Tests
    /--------\
   /          \  Unit Tests (many, fast, isolated)
  /__________\
```

E2E tests sit at the top of the testing pyramid. They are fewer in number but provide the highest confidence that the application works correctly from a user's perspective.

## Tool Selection

### Playwright (Recommended)

MeJohnC.Org uses [Playwright](https://playwright.dev/) as the primary E2E testing framework.

#### Why Playwright?

| Feature | Benefit |
|---------|---------|
| Multi-browser support | Tests run on Chromium, Firefox, and WebKit |
| Auto-waiting | Built-in waiting for elements, reducing flaky tests |
| Mobile emulation | Test responsive designs on mobile viewports |
| Tracing and debugging | Time-travel debugging with screenshots and traces |
| Network interception | Mock API responses and simulate network conditions |
| TypeScript support | First-class TypeScript integration |
| Parallel execution | Fast test runs with parallel workers |

#### Installation

Playwright is already configured in this project. For new projects:

```bash
npm init playwright@latest
```

#### Current Configuration

The Playwright configuration is defined in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Cypress (Alternative)

[Cypress](https://www.cypress.io/) is a viable alternative for E2E testing.

#### When to Consider Cypress

- Team familiarity with Cypress
- Preference for the Cypress Test Runner GUI
- Need for Cypress-specific plugins or integrations
- Component testing requirements (Cypress has built-in component testing)

#### Comparison: Playwright vs Cypress

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| Browsers | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit |
| Language | TypeScript/JavaScript | TypeScript/JavaScript |
| Speed | Faster (multi-browser parallel) | Good (parallel via Cypress Cloud) |
| Auto-waiting | Built-in | Built-in |
| Network mocking | Native support | Native support |
| Mobile testing | Device emulation | Limited viewport testing |
| iframes | Full support | Limited support |
| Multiple tabs | Full support | Not supported |
| Debugging | Traces, screenshots | Time-travel GUI |
| CI pricing | Free | Cloud features paid |

## Test Scenarios to Cover

### Happy Path User Flows

Test the primary use cases that users execute most frequently:

```typescript
// e2e/user-flows/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Primary Navigation Flow', () => {
  test('user can navigate through main pages', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    await expect(page).toHaveTitle(/MeJohnC/);

    // Navigate to portfolio
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.locator('main')).toBeVisible();

    // Navigate to about page
    await page.getByRole('link', { name: 'Collab' }).click();
    await expect(page).toHaveURL(/\/about/);
  });

  test('user can view project details', async ({ page }) => {
    await page.goto('/portfolio');

    // Click on a project card
    await page.getByTestId('project-card').first().click();

    // Verify project detail page loads
    await expect(page.getByTestId('project-detail')).toBeVisible();
  });
});
```

### Authentication Flows

Test user authentication scenarios with Clerk integration:

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('unauthenticated user sees sign-in prompt for admin routes', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to sign-in or show auth prompt
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test('authenticated user can access admin dashboard', async ({ page }) => {
    // Setup: authenticate using test credentials
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Navigate to admin
    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  });

  test('sign-out returns user to public site', async ({ page }) => {
    // Assuming authenticated state
    await page.goto('/admin');

    await page.getByRole('button', { name: /sign out/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });
});
```

### Form Submissions

Test form interactions and validation:

```typescript
// e2e/forms/contact.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test('successfully submits contact form with valid data', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Message').fill('This is a test message for E2E testing.');

    await page.getByRole('button', { name: /send|submit/i }).click();

    await expect(page.getByText(/thank you|success/i)).toBeVisible();
  });

  test('shows validation errors for invalid email', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Message').fill('Test message');

    await page.getByRole('button', { name: /send|submit/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('prevents submission with empty required fields', async ({ page }) => {
    await page.goto('/contact');

    await page.getByRole('button', { name: /send|submit/i }).click();

    // Check for required field validation
    await expect(page.getByText(/required/i)).toBeVisible();
  });
});
```

### Error Scenarios

Test how the application handles errors gracefully:

```typescript
// e2e/errors/error-handling.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('displays 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-page-12345');

    // Navigation should still be visible
    await expect(page.locator('nav')).toBeVisible();

    // Error message or 404 indicator
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('**/api/posts', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/blog');

    // Should show error state, not crash
    await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
  });

  test('recovers from temporary failures', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/data', (route) => {
      requestCount++;
      if (requestCount < 3) {
        route.abort();
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'success' }),
        });
      }
    });

    await page.goto('/data-page');

    // After retries, data should load
    await expect(page.getByTestId('data-content')).toBeVisible();
  });
});
```

### Edge Cases (Empty States, Boundary Conditions)

Test boundary conditions and edge cases:

```typescript
// e2e/edge-cases/empty-states.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Empty States', () => {
  test('displays empty state when no projects exist', async ({ page }) => {
    await page.route('**/api/projects', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto('/portfolio');

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText(/no projects/i)).toBeVisible();
  });

  test('displays empty state for search with no results', async ({ page }) => {
    await page.goto('/search');

    await page.getByRole('searchbox').fill('xyznonexistentquery123');
    await page.keyboard.press('Enter');

    await expect(page.getByText(/no results/i)).toBeVisible();
  });
});

// e2e/edge-cases/boundary-conditions.spec.ts
test.describe('Boundary Conditions', () => {
  test('handles very long text input', async ({ page }) => {
    await page.goto('/contact');

    const longText = 'A'.repeat(10000);
    await page.getByLabel('Message').fill(longText);

    await page.getByRole('button', { name: /send|submit/i }).click();

    // Should either accept or show length validation
    const response = page.getByText(/success|too long|character limit/i);
    await expect(response).toBeVisible();
  });

  test('handles special characters in input', async ({ page }) => {
    await page.goto('/search');

    await page.getByRole('searchbox').fill('<script>alert("xss")</script>');
    await page.keyboard.press('Enter');

    // Should not execute script, should sanitize or search literally
    await expect(page.locator('script')).toHaveCount(0);
  });

  test('handles rapid repeated actions', async ({ page }) => {
    await page.goto('/portfolio');

    const button = page.getByRole('button', { name: /load more/i });

    // Rapid clicks
    for (let i = 0; i < 10; i++) {
      await button.click({ force: true });
    }

    // Should not crash or show duplicate content
    await expect(page.locator('main')).toBeVisible();
  });

  test('handles pagination at boundaries', async ({ page }) => {
    await page.goto('/blog');

    // Navigate to last page
    await page.getByRole('button', { name: /last/i }).click();

    // Next should be disabled
    await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();

    // Go to first page
    await page.getByRole('button', { name: /first/i }).click();

    // Previous should be disabled
    await expect(page.getByRole('button', { name: /previous/i })).toBeDisabled();
  });
});
```

### Failure Scenarios (Network Errors, API Failures)

Test failure resilience (see dedicated section below for comprehensive coverage).

## E2E Test Architecture

### Page Object Model

The Page Object Model (POM) encapsulates page interactions, making tests more maintainable and readable.

```
e2e/
├── pages/                    # Page Object classes
│   ├── base.page.ts         # Base page with common methods
│   ├── home.page.ts         # Home page interactions
│   ├── portfolio.page.ts    # Portfolio page interactions
│   ├── admin/
│   │   ├── dashboard.page.ts
│   │   └── posts.page.ts
│   └── auth/
│       └── login.page.ts
├── fixtures/                 # Test fixtures
│   ├── test-data.ts         # Test data generators
│   └── auth.fixture.ts      # Authentication fixtures
├── helpers/                  # Utility functions
│   ├── api.helper.ts        # API interaction helpers
│   └── wait.helper.ts       # Custom wait utilities
├── specs/                    # Test specifications
│   ├── navigation.spec.ts
│   ├── portfolio.spec.ts
│   └── admin.spec.ts
└── playwright.config.ts
```

#### Base Page Class

```typescript
// e2e/pages/base.page.ts
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation
  get navigation(): Locator {
    return this.page.locator('nav');
  }

  get mainContent(): Locator {
    return this.page.locator('main');
  }

  // Common actions
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  // Navigation helpers
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async clickNavLink(name: string): Promise<void> {
    await this.page.getByRole('link', { name }).click();
    await this.waitForPageLoad();
  }
}
```

#### Specific Page Objects

```typescript
// e2e/pages/portfolio.page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PortfolioPage extends BasePage {
  readonly url = '/portfolio';

  // Locators
  get projectCards(): Locator {
    return this.page.getByTestId('project-card');
  }

  get tabList(): Locator {
    return this.page.getByRole('tablist');
  }

  get loadingSpinner(): Locator {
    return this.page.getByTestId('loading-spinner');
  }

  get emptyState(): Locator {
    return this.page.getByTestId('empty-state');
  }

  // Actions
  async goto(): Promise<void> {
    await this.navigateTo(this.url);
  }

  async selectTab(tabName: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickProject(index: number = 0): Promise<void> {
    await this.projectCards.nth(index).click();
  }

  async waitForProjectsToLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  // Assertions
  async expectProjectCount(count: number): Promise<void> {
    await expect(this.projectCards).toHaveCount(count);
  }

  async expectTabToBeActive(tabName: string): Promise<void> {
    await expect(
      this.page.getByRole('tab', { name: tabName })
    ).toHaveAttribute('aria-selected', 'true');
  }
}
```

#### Using Page Objects in Tests

```typescript
// e2e/specs/portfolio.spec.ts
import { test, expect } from '@playwright/test';
import { PortfolioPage } from '../pages/portfolio.page';

test.describe('Portfolio Page', () => {
  let portfolioPage: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    portfolioPage = new PortfolioPage(page);
    await portfolioPage.goto();
  });

  test('displays project cards', async () => {
    await portfolioPage.waitForProjectsToLoad();
    const count = await portfolioPage.projectCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can switch between tabs', async () => {
    await portfolioPage.selectTab('Projects');
    await portfolioPage.expectTabToBeActive('Projects');

    await portfolioPage.selectTab('Apps');
    await portfolioPage.expectTabToBeActive('Apps');
  });

  test('can click on a project card', async ({ page }) => {
    await portfolioPage.waitForProjectsToLoad();
    await portfolioPage.clickProject(0);

    await expect(page).toHaveURL(/\/project\//);
  });
});
```

### Test Fixtures

Fixtures provide reusable setup and teardown logic:

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Log in
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/**');

    // Use the authenticated page
    await use(page);

    // Teardown: Log out
    await page.goto('/');
    // Sign out if needed
  },

  adminPage: async ({ page }, use) => {
    // Setup: Log in as admin
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin/**');

    await use(page);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// e2e/fixtures/test-data.ts
import { faker } from '@faker-js/faker';

export const generateUser = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  message: faker.lorem.paragraph(),
});

export const generateProject = () => ({
  title: faker.commerce.productName(),
  description: faker.lorem.sentence(),
  url: faker.internet.url(),
});

export const testUsers = {
  admin: {
    email: 'admin@test.example.com',
    password: 'TestPassword123!',
  },
  regular: {
    email: 'user@test.example.com',
    password: 'TestPassword123!',
  },
};
```

### Test Data Management

#### Environment-Based Configuration

```typescript
// e2e/config/environments.ts
interface TestEnvironment {
  baseUrl: string;
  apiUrl: string;
  testUsers: {
    admin: { email: string; password: string };
    user: { email: string; password: string };
  };
}

const environments: Record<string, TestEnvironment> = {
  local: {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:5173/api',
    testUsers: {
      admin: { email: 'admin@test.local', password: 'test123' },
      user: { email: 'user@test.local', password: 'test123' },
    },
  },
  staging: {
    baseUrl: 'https://staging.mejohnc.org',
    apiUrl: 'https://staging.mejohnc.org/api',
    testUsers: {
      admin: { email: process.env.STAGING_ADMIN_EMAIL!, password: process.env.STAGING_ADMIN_PASSWORD! },
      user: { email: process.env.STAGING_USER_EMAIL!, password: process.env.STAGING_USER_PASSWORD! },
    },
  },
};

export const getEnvironment = (): TestEnvironment => {
  const env = process.env.TEST_ENV || 'local';
  return environments[env];
};
```

#### Database Seeding for Tests

```typescript
// e2e/helpers/seed.helper.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
);

export async function seedTestData() {
  // Create test projects
  await supabase.from('projects').insert([
    { title: 'Test Project 1', description: 'E2E Test Project', status: 'published' },
    { title: 'Test Project 2', description: 'Another test project', status: 'published' },
  ]);
}

export async function cleanupTestData() {
  // Remove test data
  await supabase.from('projects').delete().match({ description: 'E2E Test Project' });
}
```

## Writing E2E Tests

### Test Naming and Organization

#### Naming Conventions

```typescript
// Good: Descriptive, action-oriented test names
test('user can submit contact form with valid data', async ({ page }) => {});
test('displays error message when email is invalid', async ({ page }) => {});
test('redirects to login when accessing protected route without auth', async ({ page }) => {});

// Bad: Vague or unclear names
test('test 1', async ({ page }) => {});
test('form works', async ({ page }) => {});
test('check stuff', async ({ page }) => {});
```

#### File Organization

```
e2e/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── protected-routes.spec.ts
├── public/
│   ├── home.spec.ts
│   ├── portfolio.spec.ts
│   └── about.spec.ts
├── admin/
│   ├── dashboard.spec.ts
│   ├── posts/
│   │   ├── create.spec.ts
│   │   ├── edit.spec.ts
│   │   └── delete.spec.ts
│   └── settings.spec.ts
├── forms/
│   ├── contact.spec.ts
│   └── newsletter.spec.ts
├── errors/
│   ├── 404.spec.ts
│   └── api-errors.spec.ts
└── accessibility/
    └── a11y.spec.ts
```

#### Grouping with `describe`

```typescript
test.describe('Portfolio Page', () => {
  test.describe('Navigation', () => {
    test('can switch between tabs', async ({ page }) => {});
    test('maintains tab state on refresh', async ({ page }) => {});
  });

  test.describe('Project Cards', () => {
    test('displays project information', async ({ page }) => {});
    test('links to project detail page', async ({ page }) => {});
  });

  test.describe('Filtering', () => {
    test('can filter by category', async ({ page }) => {});
    test('shows empty state when no matches', async ({ page }) => {});
  });
});
```

### Selectors Strategy (data-testid)

#### Preferred: data-testid Attributes

```typescript
// Component
<button data-testid="submit-form-button">Submit</button>

// Test
await page.getByTestId('submit-form-button').click();
```

#### Selector Priority (Best to Worst)

1. **`data-testid`** - Most stable, not affected by UI changes
2. **Role-based** - `getByRole('button', { name: 'Submit' })`
3. **Label-based** - `getByLabel('Email')`
4. **Text-based** - `getByText('Welcome')`
5. **CSS selectors** - Last resort, most brittle

```typescript
// BEST: data-testid (stable, explicit)
await page.getByTestId('login-submit-button').click();

// GOOD: Role with name (semantic, accessible)
await page.getByRole('button', { name: 'Sign In' }).click();

// GOOD: Label (for form fields)
await page.getByLabel('Email address').fill('test@example.com');

// OK: Text content (may change with copy updates)
await page.getByText('Welcome back').isVisible();

// AVOID: CSS selectors (brittle, may break with styling changes)
await page.locator('.btn-primary.submit-form').click();

// NEVER: XPath (extremely brittle)
await page.locator('//div[@class="form"]/button[1]').click();
```

#### Implementing data-testid in Components

```tsx
// React component with test IDs
export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article data-testid="project-card">
      <h3 data-testid="project-title">{project.title}</h3>
      <p data-testid="project-description">{project.description}</p>
      <a
        href={project.url}
        data-testid="project-link"
      >
        View Project
      </a>
    </article>
  );
}
```

### Waiting Strategies

#### Auto-Waiting (Playwright's Default)

Playwright automatically waits for elements to be actionable:

```typescript
// Playwright automatically waits for the button to be visible and enabled
await page.getByRole('button', { name: 'Submit' }).click();
```

#### Explicit Waits

```typescript
// Wait for element to appear
await page.getByTestId('loading-spinner').waitFor({ state: 'hidden' });

// Wait for specific state
await page.getByRole('button', { name: 'Submit' }).waitFor({ state: 'visible' });

// Wait for navigation
await page.waitForURL('**/dashboard');

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific response
await page.waitForResponse('**/api/users');

// Custom wait with polling
await expect(page.getByTestId('data-loaded')).toBeVisible({ timeout: 10000 });
```

#### Avoiding Anti-Patterns

```typescript
// BAD: Hard-coded waits
await page.waitForTimeout(5000); // Don't do this!

// GOOD: Wait for specific condition
await page.getByTestId('content').waitFor({ state: 'visible' });

// BAD: Multiple arbitrary waits
await page.click('#button');
await page.waitForTimeout(1000);
await page.click('#next');
await page.waitForTimeout(2000);

// GOOD: Wait for meaningful events
await page.click('#button');
await page.waitForResponse('**/api/process');
await page.click('#next');
await page.getByTestId('result').waitFor();
```

### Assertions

#### Common Assertions

```typescript
import { expect } from '@playwright/test';

// Visibility
await expect(page.getByTestId('hero')).toBeVisible();
await expect(page.getByTestId('modal')).toBeHidden();

// Text content
await expect(page.getByTestId('title')).toHaveText('Welcome');
await expect(page.getByTestId('description')).toContainText('portfolio');

// Attributes
await expect(page.getByRole('link')).toHaveAttribute('href', '/portfolio');
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();

// Count
await expect(page.getByTestId('project-card')).toHaveCount(5);

// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/project\/\d+/);

// Title
await expect(page).toHaveTitle(/MeJohnC/);

// CSS
await expect(page.getByTestId('button')).toHaveClass(/active/);
await expect(page.getByTestId('alert')).toHaveCSS('color', 'rgb(255, 0, 0)');

// Input values
await expect(page.getByLabel('Email')).toHaveValue('test@example.com');
await expect(page.getByRole('checkbox')).toBeChecked();
```

#### Soft Assertions

Use soft assertions when you want to check multiple things without stopping at the first failure:

```typescript
test('page has correct elements', async ({ page }) => {
  await page.goto('/');

  // These won't stop the test on first failure
  await expect.soft(page.getByTestId('header')).toBeVisible();
  await expect.soft(page.getByTestId('navigation')).toBeVisible();
  await expect.soft(page.getByTestId('footer')).toBeVisible();
  await expect.soft(page.getByTestId('main-content')).toBeVisible();

  // This will fail the test if any soft assertions failed
});
```

## Failure Scenario Testing

### Network Failure Simulation

```typescript
// e2e/failures/network-failures.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Network Failure Handling', () => {
  test('displays offline message when network is unavailable', async ({ page, context }) => {
    await page.goto('/');

    // Simulate offline
    await context.setOffline(true);

    // Trigger an action that requires network
    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.getByText(/offline|no connection/i)).toBeVisible();

    // Restore connection
    await context.setOffline(false);
  });

  test('handles slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/');

    // Should show loading state
    await expect(page.getByTestId('loading')).toBeVisible();
  });

  test('handles connection timeout', async ({ page }) => {
    await page.route('**/api/data', async (route) => {
      // Never respond, simulating timeout
      await new Promise(() => {}); // Hangs forever
    });

    await page.goto('/data-page');

    // Should show timeout message after configured timeout
    await expect(page.getByText(/timed out|taking longer/i)).toBeVisible({ timeout: 35000 });
  });

  test('handles intermittent connectivity', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/data', async (route) => {
      requestCount++;
      if (requestCount % 2 === 1) {
        await route.abort('connectionfailed');
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/data-page');

    // Should eventually succeed
    await expect(page.getByTestId('data-loaded')).toBeVisible({ timeout: 20000 });
  });
});
```

### API Error Responses

```typescript
// e2e/failures/api-errors.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Error Handling', () => {
  test('handles 400 Bad Request', async ({ page }) => {
    await page.route('**/api/submit', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid input data'
        }),
      });
    });

    await page.goto('/form');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText(/invalid input/i)).toBeVisible();
  });

  test('handles 401 Unauthorized', async ({ page }) => {
    await page.route('**/api/protected', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/protected-page');

    // Should redirect to login or show auth error
    await expect(page.getByText(/sign in|unauthorized/i)).toBeVisible();
  });

  test('handles 403 Forbidden', async ({ page }) => {
    await page.route('**/api/admin', (route) => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Forbidden' }),
      });
    });

    await page.goto('/admin');

    await expect(page.getByText(/access denied|forbidden/i)).toBeVisible();
  });

  test('handles 404 Not Found', async ({ page }) => {
    await page.route('**/api/resource/*', (route) => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    await page.goto('/resource/12345');

    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('handles 422 Validation Error', async ({ page }) => {
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 422,
        body: JSON.stringify({
          error: 'Validation Error',
          fields: {
            email: 'Invalid email format',
            password: 'Password too short',
          },
        }),
      });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
    await expect(page.getByText(/password too short/i)).toBeVisible();
  });

  test('handles 429 Rate Limited', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({ error: 'Too Many Requests' }),
      });
    });

    await page.goto('/');

    await expect(page.getByText(/too many requests|slow down/i)).toBeVisible();
  });

  test('handles 500 Internal Server Error', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    await expect(page.getByText(/something went wrong|server error/i)).toBeVisible();
  });

  test('handles 502 Bad Gateway', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 502,
        body: 'Bad Gateway',
      });
    });

    await page.goto('/');

    await expect(page.getByText(/temporarily unavailable|try again/i)).toBeVisible();
  });

  test('handles 503 Service Unavailable', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 503,
        headers: { 'Retry-After': '120' },
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });

    await page.goto('/');

    await expect(page.getByText(/maintenance|unavailable/i)).toBeVisible();
  });

  test('handles malformed JSON response', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not valid json{',
      });
    });

    await page.goto('/data-page');

    // Should handle gracefully, not crash
    await expect(page.locator('body')).toBeVisible();
  });
});
```

### Timeout Handling

```typescript
// e2e/failures/timeout-handling.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Timeout Handling', () => {
  test('shows loading state during long operations', async ({ page }) => {
    await page.route('**/api/slow-operation', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ result: 'complete' }),
      });
    });

    await page.goto('/slow-operation');

    // Loading indicator should appear
    await expect(page.getByTestId('loading-spinner')).toBeVisible();

    // Wait for completion
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('loading-spinner')).toBeHidden();
  });

  test('can cancel long-running operations', async ({ page }) => {
    await page.route('**/api/cancellable', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 30000));
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/cancellable-operation');
    await page.getByRole('button', { name: 'Start' }).click();

    // Cancel button should appear
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should show cancelled state
    await expect(page.getByText(/cancelled/i)).toBeVisible();
  });

  test('handles form submission timeout', async ({ page }) => {
    await page.route('**/api/submit', () => {
      // Never respond
      return new Promise(() => {});
    });

    await page.goto('/contact');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    // After timeout, should show error
    await expect(page.getByText(/timed out|try again/i)).toBeVisible({ timeout: 35000 });
  });
});
```

### Retry Behavior

```typescript
// e2e/failures/retry-behavior.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Retry Behavior', () => {
  test('automatically retries failed requests', async ({ page }) => {
    let attempts = 0;

    await page.route('**/api/flaky', (route) => {
      attempts++;
      if (attempts < 3) {
        route.abort('connectionfailed');
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/flaky-data');

    // Should eventually succeed after retries
    await expect(page.getByTestId('data-loaded')).toBeVisible({ timeout: 15000 });
    expect(attempts).toBeGreaterThanOrEqual(3);
  });

  test('shows retry button after max retries exceeded', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.abort('connectionfailed');
    });

    await page.goto('/data-page');

    // After automatic retries fail, should show manual retry option
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible({ timeout: 20000 });
  });

  test('manual retry works after failure', async ({ page }) => {
    let shouldFail = true;

    await page.route('**/api/data', (route) => {
      if (shouldFail) {
        route.fulfill({ status: 500, body: 'Error' });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ data: 'success' }) });
      }
    });

    await page.goto('/data-page');

    // Initial failure
    await expect(page.getByText(/error|failed/i)).toBeVisible();

    // Fix the "server"
    shouldFail = false;

    // Click retry
    await page.getByRole('button', { name: /retry|try again/i }).click();

    // Should succeed
    await expect(page.getByText('success')).toBeVisible();
  });

  test('exponential backoff between retries', async ({ page }) => {
    const retryTimes: number[] = [];

    await page.route('**/api/data', (route) => {
      retryTimes.push(Date.now());
      if (retryTimes.length < 4) {
        route.abort('connectionfailed');
      } else {
        route.fulfill({ status: 200, body: '{}' });
      }
    });

    await page.goto('/data-page');
    await expect(page.getByTestId('data-loaded')).toBeVisible({ timeout: 30000 });

    // Verify exponential backoff (each delay should be longer)
    if (retryTimes.length >= 3) {
      const delay1 = retryTimes[1] - retryTimes[0];
      const delay2 = retryTimes[2] - retryTimes[1];
      expect(delay2).toBeGreaterThan(delay1);
    }
  });
});
```

## Running E2E Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/home.spec.ts

# Run tests matching a pattern
npx playwright test -g "navigation"

# Run in headed mode (see the browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-screenshots
          path: test-results/
          retention-days: 7
```

#### Running Against Staging

```yaml
  e2e-staging:
    runs-on: ubuntu-latest
    environment: staging
    needs: deploy-staging

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests against staging
        run: npx playwright test
        env:
          BASE_URL: ${{ vars.STAGING_URL }}
          CI: true
```

### Parallel Execution

#### Playwright Configuration for Parallelism

```typescript
// playwright.config.ts
export default defineConfig({
  // Run tests in parallel
  fullyParallel: true,

  // Number of parallel workers
  workers: process.env.CI ? 4 : undefined, // 4 workers in CI, auto in local

  // Retry configuration
  retries: process.env.CI ? 2 : 0,

  // Sharding for distributed execution
  // Run with: npx playwright test --shard=1/4
});
```

#### Sharding Across Multiple CI Jobs

```yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
```

#### Test Isolation for Parallelism

```typescript
// Each test should be independent
test.describe.configure({ mode: 'parallel' });

test.describe('Independent Tests', () => {
  // Each test creates its own state
  test('test 1', async ({ page }) => {
    // Setup specific to this test
    await page.goto('/');
  });

  test('test 2', async ({ page }) => {
    // Setup specific to this test
    await page.goto('/');
  });
});
```

## Visual Regression Testing

### Screenshot Comparison

```typescript
// e2e/visual/screenshots.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Compare full page screenshot
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01, // Allow 1% difference
    });
  });

  test('portfolio grid matches snapshot', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    // Compare specific element
    await expect(page.getByTestId('project-grid')).toHaveScreenshot('portfolio-grid.png');
  });

  test('responsive layouts match snapshots', async ({ page }) => {
    await page.goto('/');

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('home-desktop.png');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('home-tablet.png');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('home-mobile.png');
  });

  test('dark mode matches snapshot', async ({ page }) => {
    await page.goto('/');

    // Toggle dark mode
    await page.getByRole('button', { name: /theme/i }).click();

    await expect(page).toHaveScreenshot('home-dark-mode.png');
  });
});
```

### Configuration for Visual Testing

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    // Screenshot comparison settings
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02, // 2% threshold
      threshold: 0.2, // Per-pixel threshold
      animations: 'disabled', // Disable animations for consistent screenshots
    },
  },

  // Store snapshots in project
  snapshotDir: './e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
});
```

### Updating Snapshots

```bash
# Update all snapshots
npx playwright test --update-snapshots

# Update specific test snapshots
npx playwright test visual/screenshots.spec.ts --update-snapshots
```

### Handling Dynamic Content

```typescript
test('page with dynamic content', async ({ page }) => {
  await page.goto('/');

  // Mask dynamic elements
  await expect(page).toHaveScreenshot('page-with-masked-content.png', {
    mask: [
      page.getByTestId('current-time'),
      page.getByTestId('user-avatar'),
      page.getByTestId('random-ad'),
    ],
  });
});
```

## Best Practices

### Test Independence

Each test should be completely independent and able to run in any order:

```typescript
// GOOD: Each test sets up its own state
test('can add item to cart', async ({ page }) => {
  await page.goto('/products/1');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('can remove item from cart', async ({ page }) => {
  // Setup: Add item first (don't rely on previous test)
  await page.goto('/products/1');
  await page.getByRole('button', { name: 'Add to Cart' }).click();

  // Test: Remove item
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('0');
});

// BAD: Tests depend on each other
test('add item', async ({ page }) => {
  await page.goto('/products/1');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
});

test('remove item', async ({ page }) => {
  // Assumes previous test ran and added item - BRITTLE!
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Remove' }).click();
});
```

### Avoid Hard-Coded Waits

```typescript
// BAD: Arbitrary wait time
await page.waitForTimeout(3000);

// GOOD: Wait for specific condition
await page.getByTestId('content').waitFor({ state: 'visible' });
await page.waitForResponse('**/api/data');
await expect(page.getByTestId('loaded')).toBeVisible();
```

### Use Meaningful Assertions

```typescript
// BAD: Just checking existence
const element = page.getByTestId('submit');
expect(element).toBeTruthy();

// GOOD: Check meaningful state
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
await expect(page.getByTestId('error-message')).toHaveText('Email is required');
await expect(page.getByRole('heading')).toContainText('Welcome');
```

### Clean Up After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Clean up any test data created
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.afterAll(async () => {
  // Clean up database test data
  await cleanupTestData();
});
```

### Handle Flaky Tests

```typescript
// Use retries for inherently flaky tests
test.describe('Flaky external service tests', () => {
  test.describe.configure({ retries: 3 });

  test('integrates with external API', async ({ page }) => {
    // Test that may occasionally fail due to external factors
  });
});

// Add explicit waits for race conditions
test('handles async content', async ({ page }) => {
  await page.goto('/async-content');

  // Wait for specific content, not arbitrary time
  await page.getByTestId('async-content').waitFor({
    state: 'visible',
    timeout: 10000
  });
});
```

### Test Critical Paths First

Prioritize tests for the most important user flows:

1. **Core functionality**: Navigation, primary features
2. **Authentication**: Login, logout, protected routes
3. **Data operations**: CRUD operations, form submissions
4. **Error handling**: Graceful degradation, error messages
5. **Edge cases**: Empty states, boundary conditions

### Keep Tests Fast

```typescript
// Use API to set up state instead of UI when possible
test.beforeEach(async ({ request }) => {
  // Create test data via API (faster than UI)
  await request.post('/api/test/seed', {
    data: { projects: 5 }
  });
});

// Parallelize independent tests
test.describe.configure({ mode: 'parallel' });

// Use specific routes instead of navigating through UI
test('edit project', async ({ page }) => {
  // GOOD: Go directly to edit page
  await page.goto('/admin/projects/1/edit');

  // BAD: Navigate through multiple pages
  // await page.goto('/admin');
  // await page.click('Projects');
  // await page.click('Project 1');
  // await page.click('Edit');
});
```

### Document Test Requirements

```typescript
/**
 * @description Tests the newsletter subscription flow
 * @prerequisites
 *   - Valid test email that can receive mail
 *   - Email service must be configured
 * @testData Uses generated email via faker
 */
test('user can subscribe to newsletter', async ({ page }) => {
  // Test implementation
});
```

## References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Google Testing Blog - Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Initial documentation created for issue #64 | Claude Code |
