// @ts-check
import { test, expect } from '@playwright/test';
import { registerAndLogin, login, logout, isLoggedIn } from './helpers/auth.js';

test.describe('Authentication Flow', () => {
  test('user can register, log in, and log out', async ({ page }) => {
    // Step 1: Register a new user
    const credentials = await registerAndLogin(page);
    
    // Verify we're logged in by checking for navigation or user menu
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
    
    // Verify we're on the homepage (login redirects there)
    await expect(page).toHaveURL('/');

    // Step 2: Log out
    await logout(page);
    
    // Verify we're logged out (back on home page)
    await expect(page).toHaveURL('/');
    
    // Verify login form is visible again
    const loginForm = page.getByLabel(/username/i);
    await expect(loginForm).toBeVisible();

    // Step 3: Log back in with same credentials
    await login(page, credentials);
    
    // Verify we're logged in again
    const loggedInAgain = await isLoggedIn(page);
    expect(loggedInAgain).toBe(true);
  });

  test('user can login with existing credentials', async ({ page }) => {
    // First register a user
    const credentials = await registerAndLogin(page);
    
    // Log out
    await logout(page);
    
    // Log back in
    await login(page, credentials);
    
    // Verify successful login
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });

  test('login fails with incorrect password', async ({ page }) => {
    // Register a user first
    const credentials = await registerAndLogin(page);
    await logout(page);

    // Try to login with wrong password
    await page.goto('/');
    await page.getByLabel(/username/i).fill(credentials.username);
    await page.getByLabel(/password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should see error message
    const errorMessage = page.locator('.error-message').or(
      page.getByText(/login failed|invalid|incorrect/i)
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});

