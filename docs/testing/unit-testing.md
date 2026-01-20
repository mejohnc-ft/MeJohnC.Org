# Unit Testing Strategy

> Issue #62: Increase unit test coverage to 70%+

This document outlines the unit testing strategy, setup, and best practices for the MeJohnC.Org project.

## Overview

Unit testing is a critical part of our development workflow. We use **Vitest** as our test runner, integrated with **React Testing Library** for component testing. Our goal is to maintain **70%+ code coverage** while focusing on testing code that matters most.

### Testing Philosophy

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Write tests that provide confidence** - Every test should catch real bugs
3. **Keep tests fast and isolated** - Each test should run independently
4. **Prioritize critical paths** - Authentication, data transformations, and security code require higher coverage

## Current Test Setup

### Vitest Configuration

The test configuration is embedded in `vite.config.ts`:

```typescript
// vite.config.ts
export default defineConfig({
  // ... other config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

**Key configuration options:**
- `globals: true` - Enables global `describe`, `it`, `expect` without imports
- `environment: 'jsdom'` - Simulates browser DOM for React components
- `setupFiles` - Runs setup code before all tests
- `include` - Pattern matching for test files

### Test Setup File

Located at `src/test/setup.ts`, this file configures the test environment:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});
```

### Dependencies

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.1",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^27.4.0",
    "vitest": "^4.0.17"
  }
}
```

## Coverage Goals and Metrics

### Target: 70%+ Overall Coverage

| Metric | Target | Priority |
|--------|--------|----------|
| Line Coverage | 70% | High |
| Branch Coverage | 65% | Medium |
| Function Coverage | 70% | High |
| Statement Coverage | 70% | High |

### Critical Paths Requiring Higher Coverage (90%+)

These areas require **90%+ coverage** due to their impact on security and data integrity:

1. **Security utilities** (`src/lib/security.test.ts`)
   - XSS sanitization with DOMPurify
   - Input validation and escaping
   - CSRF token handling

2. **Data validation schemas** (`src/lib/schemas.ts`)
   - Zod schema validation
   - API response parsing
   - Type guards

3. **Error handling** (`src/lib/errors.ts`)
   - Error class implementations
   - Error formatting for logging
   - User-friendly error messages

4. **Authentication logic** (`src/lib/auth.tsx`, `src/lib/rbac.ts`)
   - Role-based access control
   - Permission checks
   - Session management

5. **Data transformation utilities** (`src/lib/markdown.ts`)
   - Markdown rendering
   - Date formatting
   - Content extraction

## What to Test

### Utility Functions

Pure functions with clear inputs and outputs are ideal candidates for unit testing.

**Example from `src/lib/supabase-queries.test.ts`:**

```typescript
describe('generateSlug', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('my blog post')).toBe('my-blog-post');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello! @World #2024')).toBe('hello-world-2024');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});
```

### React Hooks

Custom hooks should be tested with `@testing-library/react`'s `renderHook`.

**Example from `src/hooks/useDataFetching.test.ts`:**

```typescript
describe('useDataFetching', () => {
  it('fetches data on mount', async () => {
    const testData = { id: 1, name: 'Test' };
    const fetchFn = vi.fn().mockResolvedValue(testData);

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors', async () => {
    const error = new Error('Fetch failed');
    const fetchFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch failed');
  });
});
```

### Component Logic

Focus on component behavior, not rendering details.

**Example from `src/components/ErrorBoundary.test.tsx`:**

```typescript
describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const fallback = <div>Custom error fallback</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });
});
```

### API Handlers and Data Transformations

Test response parsing, error handling, and data transformations.

**Example from `src/lib/schemas.test.ts`:**

```typescript
describe('parseResponse', () => {
  it('returns parsed data for valid input', () => {
    const validSuite = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Suite',
      // ... other fields
    };

    const result = parseResponse(AppSuiteSchema, validSuite, 'test');
    expect(result.name).toBe('Test Suite');
  });

  it('throws for invalid input', () => {
    const invalidSuite = { id: 'not-valid' };

    expect(() => {
      parseResponse(AppSuiteSchema, invalidSuite, 'test');
    }).toThrow('Invalid response format from test');
  });
});
```

### Security-Critical Code

Security utilities require comprehensive testing.

**Example from `src/lib/security.test.ts`:**

```typescript
describe('DOMPurify sanitization', () => {
  it('removes script tags from HTML content', () => {
    const maliciousHtml = '<p>Hello</p><script>alert("xss")</script>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<p>Hello</p>');
  });

  it('removes javascript: URLs', () => {
    const maliciousHtml = '<a href="javascript:alert(\'xss\')">Click</a>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('javascript:');
  });
});
```

## Testing Patterns

### Arrange-Act-Assert (AAA)

Structure every test with three clear sections:

```typescript
it('calculates reading time correctly', () => {
  // Arrange - Set up test data
  const words = Array(400).fill('word').join(' ');

  // Act - Execute the function being tested
  const result = calculateReadingTime(words);

  // Assert - Verify the result
  expect(result).toBe(2);
});
```

### Test Isolation

Each test should be independent and not rely on state from other tests:

```typescript
describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset mocks before each test
  });

  it('starts with idle state', () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useMutation(mutationFn));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

### Mocking Strategies

#### Mocking Modules

```typescript
// Mock entire module
vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
}));

// Mock with partial implementation
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));
```

#### Mocking Functions

```typescript
// Simple mock
const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

// Mock with implementation
const fetchFn = vi.fn().mockImplementation(() => {
  callCount++;
  return Promise.resolve({ count: callCount });
});

// Mock rejection
const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));
```

#### Mocking Browser APIs

These are configured globally in `src/test/setup.ts`:
- `window.matchMedia`
- `localStorage`
- `IntersectionObserver`

#### Mocking Timers

```typescript
describe('debounced function', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

## Running Tests

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |

### Watch Mode

```bash
npm run test
```

Watch mode re-runs tests when files change. Press keys for filtering:
- `p` - Filter by filename
- `t` - Filter by test name
- `a` - Run all tests
- `f` - Run only failed tests
- `q` - Quit

### Coverage Reports

```bash
npm run test:coverage
```

This generates a coverage report showing:
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Uncovered line numbers

### Running Specific Tests

```bash
# Run tests matching a pattern
npm run test -- markdown

# Run a specific file
npm run test -- src/lib/markdown.test.ts

# Run tests with a specific name
npm run test -- -t "removes script tags"
```

## Writing Good Unit Tests

### Test Naming Conventions

Use descriptive names that explain what is being tested and the expected outcome:

```typescript
// Good - describes behavior
it('returns 1 for very short content', () => { ... });
it('throws for invalid input', () => { ... });
it('calls onSuccess callback on successful fetch', () => { ... });

// Avoid - vague or implementation-focused
it('works', () => { ... });
it('test 1', () => { ... });
it('calls the function', () => { ... });
```

**Pattern:** `it('[action] [expected result] [condition]')`

### One Assertion Per Test (Preferred)

Each test should verify one specific behavior:

```typescript
// Preferred - single assertion
it('converts to lowercase', () => {
  expect(generateSlug('Hello World')).toBe('hello-world');
});

it('replaces spaces with hyphens', () => {
  expect(generateSlug('my blog post')).toBe('my-blog-post');
});

// Acceptable - multiple related assertions
it('preserves safe HTML content', () => {
  const safeHtml = '<h1>Title</h1><p>Text</p>';
  const sanitized = DOMPurify.sanitize(safeHtml);

  expect(sanitized).toContain('<h1>Title</h1>');
  expect(sanitized).toContain('<p>Text</p>');
});
```

### Testing Edge Cases

Always test boundary conditions and edge cases:

```typescript
describe('extractExcerpt', () => {
  it('returns full text if under max length', () => {
    const text = 'Short text';
    expect(extractExcerpt(text)).toBe('Short text');
  });

  it('truncates at word boundary', () => {
    const text = 'This is a longer piece of text...';
    const excerpt = extractExcerpt(text, 50);

    expect(excerpt.length).toBeLessThanOrEqual(53);
    expect(excerpt.endsWith('...')).toBe(true);
  });

  it('handles empty string', () => {
    expect(extractExcerpt('')).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(extractExcerpt(null as unknown as string)).toBe('');
  });
});
```

### Documenting Known Behaviors

When testing reveals unexpected but intentional behavior, document it:

```typescript
it('converts leading/trailing spaces to hyphens (current behavior)', () => {
  // Note: Current implementation converts spaces to hyphens before trimming
  // This test documents actual behavior - consider fixing if undesired
  expect(generateSlug('  hello world  ')).toBe('-hello-world-');
});
```

## Coverage Gaps to Prioritize

### High Priority (Security and Data Integrity)

| File | Current Status | Target |
|------|----------------|--------|
| `src/lib/validation.ts` | Needs tests | 90%+ |
| `src/lib/csrf.ts` | Needs tests | 90%+ |
| `src/lib/rbac.ts` | Needs tests | 90%+ |
| `src/hooks/usePermissions.ts` | Needs tests | 90%+ |
| `src/lib/audit.ts` | Needs tests | 85%+ |

### Medium Priority (Core Functionality)

| File | Current Status | Target |
|------|----------------|--------|
| `src/lib/retry.ts` | Needs tests | 80%+ |
| `src/lib/circuit-breaker.ts` | Needs tests | 80%+ |
| `src/lib/feature-flags.ts` | Needs tests | 75%+ |
| `src/hooks/useFeatureFlags.ts` | Needs tests | 75%+ |
| `src/lib/bookmark-parser.ts` | Needs tests | 75%+ |

### Lower Priority (UI Components)

| File | Current Status | Target |
|------|----------------|--------|
| `src/components/Skeleton.tsx` | Needs tests | 70% |
| `src/components/BlogCard.tsx` | Needs tests | 70% |
| `src/components/OptimizedImage.tsx` | Needs tests | 70% |

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on every pull request:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

Tests can be configured to run before commits via Husky (already configured):

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write --ignore-unknown"
    ]
  }
}
```

To add test running to pre-commit:

```bash
# .husky/pre-commit
npm run test:run --passWithNoTests
```

### Coverage Thresholds

Configure minimum coverage thresholds in `vite.config.ts`:

```typescript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.d.ts',
      '**/*.test.{ts,tsx}',
    ],
    thresholds: {
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
    },
  },
}
```

## Test Maintenance Guidelines

### When to Update Tests

1. **Feature changes** - Update tests when functionality changes
2. **Bug fixes** - Add a test that catches the bug before fixing
3. **Refactoring** - Tests should pass without modification if behavior is unchanged
4. **Dependency updates** - Verify tests pass after updating dependencies

### Keeping Tests Fast

- Mock expensive operations (network calls, file I/O)
- Use `vi.fn()` instead of real implementations where possible
- Avoid unnecessary setup/teardown
- Run tests in parallel (Vitest default)

### Test Organization

```
src/
  lib/
    markdown.ts
    markdown.test.ts      # Tests co-located with source
  hooks/
    useDataFetching.ts
    useDataFetching.test.ts
  components/
    ErrorBoundary.tsx
    ErrorBoundary.test.tsx
  test/
    setup.ts              # Global test setup
    utils.ts              # Shared test utilities
```

### Reviewing Test Quality

When reviewing PRs, check that tests:

1. Actually test the changed code
2. Cover edge cases and error conditions
3. Are not flaky (deterministic results)
4. Have clear, descriptive names
5. Follow the AAA pattern
6. Don't duplicate existing tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Vitest Mocking](https://vitest.dev/guide/mocking.html)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
