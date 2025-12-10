// @ts-check
import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth.js';
import { fillSongForm } from './helpers/song-form.js';

test.describe('Collaboration Flow', () => {
  test('user A and user B can go through collaboration request flow', async ({ browser }) => {
    // Create two separate browser contexts for two users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Step 1: Register and login as User A
      const credentialsA = await registerAndLogin(pageA);
      
      // Step 2: User A creates a public song suitable for collaboration
      const songTitle = `Collaboration Test ${Date.now()}`;
      await fillSongForm(pageA, {
        title: songTitle,
        artist: 'Test Artist',
        status: 'In Progress'
      });
      
      // Make song public (look for public toggle/checkbox)
      const publicToggle = pageA.getByLabel(/public/i).or(
        pageA.locator('input[type="checkbox"]').filter({ hasText: /public/i })
      );
      if (await publicToggle.isVisible().catch(() => false)) {
        await publicToggle.check();
      }
      
      await pageA.getByRole('button', { name: /add song/i }).click();
      await pageA.waitForURL(/\/wip/, { timeout: 10000 });
      
      // Step 3: Make the song public if not already done
      // Navigate to song detail or edit page to toggle public visibility
      // Look for public toggle in the song card or edit modal
      const songCardA = pageA.locator(`text=${songTitle}`).locator('..').locator('..').first();
      await expect(songCardA).toBeVisible({ timeout: 5000 });
      
      // Try to find and click public toggle in the song card
      const publicToggleInCard = songCardA.locator('input[type="checkbox"]').filter({ hasText: /public/i }).or(
        songCardA.getByLabel(/public/i)
      );
      if (await publicToggleInCard.isVisible().catch(() => false)) {
        await publicToggleInCard.check();
        await pageA.waitForTimeout(500);
      }
      
      // Step 4: Register and login as User B
      const credentialsB = await registerAndLogin(pageB);
      
      // Step 5: User B discovers the song via Community/Public WIP UI
      await pageB.goto('/community');
      
      // Wait for community page to load
      await pageB.waitForTimeout(2000);
      
      // Look for the song in the public songs list
      // It might be in a card or row format
      const songInCommunity = pageB.locator(`text=${songTitle}`).first();
      
      // If not immediately visible, try searching or filtering
      if (!(await songInCommunity.isVisible().catch(() => false))) {
        // Try using search if available
        const searchInput = pageB.getByPlaceholder(/search/i).or(
          pageB.locator('input[type="search"]')
        );
        if (await searchInput.isVisible().catch(() => false)) {
          await searchInput.fill(songTitle);
          await pageB.waitForTimeout(1000);
        }
      }
      
      // Verify song is visible in community
      await expect(songInCommunity).toBeVisible({ timeout: 10000 });
      
      // Step 6: User B sends collaboration request
      // Find the "Collaborate" button near the song
      const collaborateButton = pageB.getByRole('button', { name: /collaborate/i }).first();
      
      // The button might be in the same container as the song title
      const songContainer = songInCommunity.locator('..').locator('..').first();
      const collaborateBtnNearSong = songContainer.getByRole('button', { name: /collaborate/i });
      
      const btnToClick = await collaborateBtnNearSong.isVisible().catch(() => false) 
        ? collaborateBtnNearSong 
        : collaborateButton;
      
      await btnToClick.click();
      
      // Fill in collaboration request modal
      await pageB.waitForTimeout(500);
      
      // Look for message textarea in modal
      const messageInput = pageB.locator('textarea').or(
        pageB.getByLabel(/message/i)
      ).first();
      
      if (await messageInput.isVisible().catch(() => false)) {
        await messageInput.fill('I would like to help with this song!');
      }
      
      // Submit the collaboration request
      const submitButton = pageB.getByRole('button', { name: /send|submit|request/i }).first();
      await submitButton.click();
      
      // Wait for confirmation
      await pageB.waitForTimeout(1000);
      
      // Step 7: User A accepts the collaboration request
      await pageA.goto('/collaboration-requests');
      
      // Wait for collaboration requests page to load
      await pageA.waitForTimeout(2000);
      
      // Find the pending request
      const requestCard = pageA.locator(`text=${songTitle}`).or(
        pageA.locator(`text=${credentialsB.username}`)
      ).first();
      
      await expect(requestCard).toBeVisible({ timeout: 10000 });
      
      // Click accept button
      const acceptButton = pageA.getByRole('button', { name: /accept/i }).first();
      await acceptButton.click();
      
      // Wait for request to be processed
      await pageA.waitForTimeout(1000);
      
      // Step 8: Verify User B now has edit access
      // User B should be able to see/edit the song
      await pageB.goto('/wip');
      await pageB.waitForTimeout(2000);
      
      // Look for the song in User B's WIP page (as collaborator)
      // The song might appear in a "Collaborations" section or similar
      const songInUserBWip = pageB.locator(`text=${songTitle}`).first();
      
      // Note: The exact UI for showing collaborated songs may vary
      // This assertion might need adjustment based on actual UI implementation
      const hasAccess = await songInUserBWip.isVisible().catch(() => false);
      
      // At minimum, verify the collaboration request was accepted
      // by checking that User B can see the song or that the request status changed
      expect(hasAccess).toBeTruthy();
      
    } finally {
      // Cleanup: close contexts
      await contextA.close();
      await contextB.close();
    }
  });
});

