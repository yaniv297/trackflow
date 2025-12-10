// @ts-check
import { test, expect } from '@playwright/test';
import { registerAndLogin, logout } from './helpers/auth.js';
import { fillSongForm } from './helpers/song-form.js';

test.describe('Release and Public Visibility', () => {
  test('user can release a song and it appears in public releases', async ({ page }) => {
    // Login
    await registerAndLogin(page);
    
    // Create a song
    const songTitle = `Release Test ${Date.now()}`;
    await fillSongForm(page, {
      title: songTitle,
      artist: 'Test Artist',
      status: 'In Progress'
    });
    await page.waitForURL(/\/wip/, { timeout: 10000 });
    
    // Find the song card
    const songCard = page.locator(`text=${songTitle}`).locator('..').locator('..').first();
    await expect(songCard).toBeVisible({ timeout: 5000 });
    
    // Mark some workflow steps as complete (optional, but helps verify completion)
    // Expand the card first
    const expandButton = songCard.locator('button').or(
      songCard.locator('[class*="expand"]')
    ).first();
    
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }
    
    // Mark at least one workflow step as complete
    const workflowSteps = songCard.locator('span[style*="cursor: pointer"]').or(
      songCard.locator('span').filter({ hasText: /tempo|drums|bass|guitar|vocals|midi/i })
    );
    
    const stepCount = await workflowSteps.count();
    if (stepCount > 0) {
      await workflowSteps.first().click();
      await page.waitForTimeout(300);
    }
    
    // Change song status to "Released"
    // Look for status dropdown or edit button in the song card
    const statusDropdown = songCard.locator('select').or(
      songCard.getByLabel(/status/i)
    ).first();
    
    if (await statusDropdown.isVisible().catch(() => false)) {
      await statusDropdown.selectOption('Released');
      await page.waitForTimeout(500);
    } else {
      // Try finding an edit button or menu
      const editButton = songCard.locator('button').filter({ hasText: /edit|options|menu/i }).first();
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(300);
        
        // Look for status change option in dropdown/menu
        const releaseOption = page.getByRole('button', { name: /release/i }).or(
          page.getByText(/release/i)
        ).first();
        if (await releaseOption.isVisible().catch(() => false)) {
          await releaseOption.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Verify song appears in released songs page
    await page.goto('/released');
    await page.waitForTimeout(2000);
    
    const releasedSong = page.locator(`text=${songTitle}`).first();
    await expect(releasedSong).toBeVisible({ timeout: 10000 });
    
    // Verify song appears in public releases page (logged out view)
    await logout(page);
    
    await page.goto('/releases');
    await page.waitForTimeout(2000);
    
    // Look for the song in the public releases list
    const publicRelease = page.locator(`text=${songTitle}`).or(
      page.locator(`text=${songArtist}`)
    ).first();
    
    await expect(publicRelease).toBeVisible({ timeout: 10000 });
    
    // Verify song appears on user's public profile
    // First, we need to get the username - login again to check
    // For this test, we'll just verify the releases page shows it
    // In a real scenario, you'd navigate to /profile/{username}
  });

  test('released song appears on user public profile', async ({ page }) => {
    // Login and create a released song
    const credentials = await registerAndLogin(page);
    
    const songTitle = `Profile Release ${Date.now()}`;
    await fillSongForm(page, {
      title: songTitle,
      artist: 'Test Artist',
      status: 'Released'
    });
    await page.waitForURL(/\/released/, { timeout: 10000 });
    
    // Logout and check public profile
    await logout(page);
    
    // Navigate to user's public profile
    await page.goto(`/profile/${credentials.username}`);
    await page.waitForTimeout(2000);
    
    // Look for released songs section
    const releasedSection = page.locator('text=/released/i').or(
      page.locator('[class*="released"]')
    ).first();
    
    // The song should appear in the released section
    const songOnProfile = page.locator(`text=${songTitle}`).first();
    await expect(songOnProfile).toBeVisible({ timeout: 10000 });
  });
});

