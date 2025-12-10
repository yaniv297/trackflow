/**
 * Authentication helper functions for E2E tests
 * 
 * These helpers interact with the actual UI components for login/registration,
 * using selectors that match the real components in the codebase.
 */

/**
 * Login using existing test user credentials from environment variables
 * Falls back to registration if credentials not provided
 * 
 * Environment variables:
 * - TEST_USERNAME: Test user username (default: uses registration)
 * - TEST_PASSWORD: Test user password (default: uses registration)
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Options
 * @param {string} options.username - Username (overrides env var)
 * @param {string} options.password - Password (overrides env var)
 * @param {boolean} options.forceRegistration - Force registration even if credentials exist
 * @returns {Promise<{username: string, email?: string, password: string}>} - The credentials used
 */
export async function registerAndLogin(page, options = {}) {
  // Check for test credentials from environment or options
  const testUsername = options.username || process.env.TEST_USERNAME;
  const testPassword = options.password || process.env.TEST_PASSWORD;
  
  // If credentials are provided and we're not forcing registration, use login
  if (!options.forceRegistration && testUsername && testPassword) {
    await login(page, { username: testUsername, password: testPassword });
    return { username: testUsername, password: testPassword };
  }

  // Otherwise, fall back to registration (this will fail if RegistrationWizard is complex)
  // For now, throw an error suggesting to use TEST_USERNAME/TEST_PASSWORD
  throw new Error(
    'Registration via UI is not supported. Please set TEST_USERNAME and TEST_PASSWORD ' +
    'environment variables, or provide credentials in options: ' +
    'registerAndLogin(page, { username: "youruser", password: "yourpass" })'
  );
}

/**
 * Login via the login UI on the homepage
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 */
export async function login(page, { username, password }) {
  // Navigate to home page (login form is on homepage)
  await page.goto('/');

  // Wait for login form to be visible
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });

  // Fill in login form
  // LoginSection uses input with name="username" and name="password"
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);

  // Click sign in button
  const signInButton = page.getByRole('button', { name: /sign in/i });
  await signInButton.click();

  // Wait for login to complete - the navigation bar (nav.unified-nav) appears when authenticated
  // This is more reliable than waiting for URL change since login redirects to /
  try {
    await page.waitForSelector('nav.unified-nav', { timeout: 15000 });
  } catch (e) {
    // Fallback: check for any nav element or navigation class
    await page.waitForSelector('nav, [class*="navigation"], [class*="unified-nav"]', { timeout: 5000 });
  }

  // Additional verification: ensure we're actually logged in
  // The nav bar should be visible
  const navBar = page.locator('nav').first();
  const isVisible = await navBar.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isVisible) {
    // Check if there's an error message
    const errorMsg = page.locator('.error-message');
    const hasError = await errorMsg.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorMsg.textContent();
      throw new Error(`Login failed: ${errorText}`);
    }
    throw new Error('Login failed - navigation bar not visible after login attempt');
  }
}

/**
 * Logout via the UI
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logout(page) {
  // Look for logout button in user menu/dropdown
  // AppNavigation has a user dropdown with logout option
  const userMenuButton = page.getByRole('button', { name: /user|menu|account/i }).or(
    page.locator('[aria-label*="user"]')
  ).first();

  // Try to find and click user menu
  if (await userMenuButton.isVisible().catch(() => false)) {
    await userMenuButton.click();
    await page.waitForTimeout(300);
  }

  // Click logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    // Fallback: try to find logout link
    const logoutLink = page.getByRole('link', { name: /logout|sign out/i });
    if (await logoutLink.isVisible().catch(() => false)) {
      await logoutLink.click();
    }
  }

  // Wait for navigation back to home
  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * Check if user is logged in by looking for authenticated UI elements
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} - True if logged in
 */
export async function isLoggedIn(page) {
  // Check for navigation bar (only visible when logged in)
  const navBar = page.locator('nav').or(page.locator('[class*="navigation"]'));
  const isNavVisible = await navBar.isVisible().catch(() => false);
  
  // Also check for user menu or username display
  const userIndicator = page.getByText(/welcome|user|menu/i).or(
    page.locator('[class*="user"]')
  );
  const hasUserIndicator = await userIndicator.first().isVisible().catch(() => false);

  return isNavVisible || hasUserIndicator;
}

