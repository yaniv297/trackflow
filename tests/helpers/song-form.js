/**
 * Helper functions for interacting with the song form
 */

/**
 * Fill in the new song form
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} songData - Song data
 * @param {string} songData.title - Song title
 * @param {string} songData.artist - Song artist
 * @param {string} [songData.status] - Song status (default: "In Progress")
 * @param {string} [songData.pack] - Pack name (optional)
 * @param {string} [songData.notes] - Notes (optional)
 */
export async function fillSongForm(page, { title, artist, status = "In Progress", pack, notes }) {
  // Navigate to new song form
  await page.goto("/new", { waitUntil: 'networkidle' });

  // Wait for form to be visible - check for title input
  // If we're not authenticated, ProtectedRoute will redirect to /, so this will timeout
  await page.waitForSelector('input[name="title"]', { timeout: 15000 });

  // Fill title field using name attribute for reliability
  await page.locator('input[name="title"]').fill(title);

  // Fill artist field - SmartDropdown component
  // SmartDropdown uses placeholder "Select or add artist name"
  const artistInput = page.locator('input[placeholder*="Select or add artist name" i]').or(
    page.locator('input[placeholder*="artist" i]')
  ).first();
  
  await artistInput.click({ timeout: 5000 });
  await artistInput.fill(artist);
  // Wait for dropdown options to load, then press Enter to confirm selection
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200); // Wait for value to be set

  // Set status if provided
  if (status) {
    await page.getByLabel(/status/i).selectOption(status);
  }

  // Fill pack if provided
  if (pack) {
    const packInput = page.locator('input[placeholder*="Select existing pack or type new pack name" i]').or(
      page.locator('input[placeholder*="pack" i]')
    ).first();
    await packInput.click({ timeout: 5000 });
    await packInput.fill(pack);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
  }

  // Fill notes if provided
  if (notes) {
    await page.locator('textarea[name="notes"]').fill(notes);
  }

  // Submit the form
  await page.getByRole("button", { name: /add song/i }).click();
}

