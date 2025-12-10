# TrackFlow E2E Testing Guide

This document describes the End-to-End (E2E) testing setup for TrackFlow using Playwright.

## Prerequisites

Before running E2E tests, ensure:

1. **Backend is running** on `http://localhost:8001`
   ```bash
   cd backend
   # Start your FastAPI server (method depends on your setup)
   ```

2. **Frontend is running** on `http://localhost:3000`
   ```bash
   cd frontend
   npm start
   ```

3. **Playwright browsers are installed**
   ```bash
   npx playwright install
   ```

4. **Test user credentials configured**
   
   Tests use an existing test user account. Set credentials via environment variables:
   
   ```bash
   # Option 1: Export environment variables (recommended for development)
   export TEST_USERNAME="testing"
   export TEST_PASSWORD="Qazwsx123"
   npm run test:e2e
   
   # Option 2: Create a .env file in the project root
   echo "TEST_USERNAME=testing" > .env
   echo "TEST_PASSWORD=Qazwsx123" >> .env
   npm run test:e2e
   
   # Option 3: Inline for a single run
   TEST_USERNAME="testing" TEST_PASSWORD="Qazwsx123" npm run test:e2e
   ```
   
   **Note**: The test user should already exist in your database. Tests will log in using these credentials rather than creating new users.
   
   **Default Test Credentials**:
   - Username: `testing`
   - Password: `Qazwsx123`

## Running Tests

### Basic Commands

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Run tests with Playwright UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test tests/auth.spec.js

# Run tests matching a pattern
npx playwright test --grep "authentication"

# Run tests in a specific browser
npx playwright test --project=chromium
```

## Test Structure

### Test Files

All E2E tests are located in the `tests/` directory:

- **`auth.spec.js`** - Authentication flows (registration, login, logout)
- **`song-workflow.spec.js`** - Song creation and workflow step completion
- **`collaboration-flow.spec.js`** - Multi-user collaboration request flow
- **`release-and-public.spec.js`** - Song release and public visibility
- **`achievements-basic.spec.js`** - Achievement unlocking flows

### Test Helpers

Helper functions are in `tests/helpers/`:

- **`auth.js`** - Authentication helpers:
  - `registerAndLogin(page, options)` - Register a new user and log in
  - `login(page, credentials)` - Log in with existing credentials
  - `logout(page)` - Log out via UI
  - `isLoggedIn(page)` - Check if user is logged in

## Core Flows Covered

### 1. Authentication Flow (`auth.spec.js`)
- ✅ User registration
- ✅ User login
- ✅ User logout
- ✅ Login with incorrect credentials (error handling)

### 2. Song Workflow (`song-workflow.spec.js`)
- ✅ Create a new song
- ✅ Mark workflow steps as completed
- ✅ Verify progress indicators update
- ✅ Create songs with different statuses (Future Plans, In Progress, Released)

### 3. Collaboration Flow (`collaboration-flow.spec.js`)
- ✅ User A creates a public song
- ✅ User B discovers the song via Community page
- ✅ User B sends a collaboration request
- ✅ User A accepts the collaboration request
- ✅ User B gains edit access to the song

### 4. Release and Public Visibility (`release-and-public.spec.js`)
- ✅ Release a song (change status to "Released")
- ✅ Verify song appears in releases page
- ✅ Verify song appears in public releases (logged out view)
- ✅ Verify song appears on user's public profile

### 5. Achievements (`achievements-basic.spec.js`)
- ✅ Verify achievements unlock when performing actions
- ✅ Check achievement notifications appear
- ✅ Verify achievements page displays unlocked achievements

## Configuration

The Playwright configuration is in `playwright.config.js`:

- **Base URL**: `http://localhost:3000` (frontend)
- **Backend URL**: `http://localhost:8001` (expected, not configured in Playwright)
- **Browsers**: Chromium (default), Firefox and WebKit available but commented out
- **Timeouts**: 10s for actions, 30s for navigation
- **Screenshots/Videos**: Captured on failure only

## Writing New Tests

### Basic Test Structure

```javascript
import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth.js';

test.describe('Feature Name', () => {
  test('test description', async ({ page }) => {
    // Arrange: Set up test state
    await registerAndLogin(page);
    
    // Act: Perform actions
    await page.goto('/some-page');
    await page.click('button');
    
    // Assert: Verify results
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use helper functions** - Leverage `tests/helpers/auth.js` for common operations
2. **Use resilient selectors** - Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
3. **Wait for elements** - Use Playwright's auto-waiting, but add explicit waits for async operations
4. **Clean up** - Tests may leave test data in the database; this is acceptable for dev/staging
5. **Test happy paths** - Focus on core user flows, not exhaustive edge cases

### Selector Guidelines

- ✅ **Good**: `page.getByRole('button', { name: /sign in/i })`
- ✅ **Good**: `page.getByLabel(/username/i)`
- ✅ **Good**: `page.getByText(/song title/i)`
- ❌ **Avoid**: `page.locator('#magic-id-123')` (brittle CSS selectors)
- ❌ **Avoid**: `page.locator('div > div > span')` (deep CSS paths)

## CI/CD Integration

The Playwright config includes commented sections for CI integration:

```javascript
// In playwright.config.js:
webServer: {
  command: 'cd frontend && npm start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

To enable CI integration:
1. Uncomment the `webServer` section
2. Add backend startup command if needed
3. Configure environment variables for CI environment

## Troubleshooting

### Tests fail with "Navigation timeout"
- Ensure backend is running on port 8001
- Ensure frontend is running on port 3000
- Check network connectivity

### Tests fail with "Element not found"
- Check if UI has changed (selectors may need updating)
- Use Playwright's UI mode (`npm run test:e2e:ui`) to debug
- Check browser console for JavaScript errors

### Tests are flaky
- Add explicit waits for async operations
- Increase timeout values if needed
- Check for race conditions in test logic

## Environment Notes

- **Development**: Tests run against `localhost:3000` and `localhost:8001`
- **Staging**: Update `baseURL` in `playwright.config.js` for staging environment
- **Production**: ⚠️ **DO NOT** run E2E tests against production

## Future Enhancements

Potential improvements:
- Add more test coverage for edge cases
- Add visual regression testing
- Add API mocking for faster tests
- Add test data cleanup utilities
- Add performance testing scenarios

