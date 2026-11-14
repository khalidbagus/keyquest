/**
 * Playwright E2E Test: Mouse-Only Activation Verification
 * Tests that the defect exists before repair and is fixed after repair.
 * Requirements: 8.7, 18.4, 5.1, 5.2, 5.3
 */

import { test, expect } from './fixtures';

test.describe('Mouse-Only Activation Defect Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start the challenge
    await page.click('[data-testid="start-challenge"]');
    // Wait for sandbox to be visible
    await expect(page.locator('[data-testid="challenge-sandbox"]')).toBeVisible();
  });

  test('defective element is focusable but does not respond to keyboard before repair', async ({ page }) => {
    const addButton = page.locator('[data-testid="defect-mouse-only"]');
    
    // Verify element exists and is focusable
    await expect(addButton).toBeVisible();
    await addButton.focus();
    await expect(addButton).toBeFocused();

    // Set up click detection
    let clickFired = false;
    await page.exposeFunction('recordMouseOnlyClick', () => {
      clickFired = true;
    });

    // Add click listener to detect activation
    await addButton.evaluate((el) => {
      el.addEventListener('click', () => {
        // @ts-expect-error - exposed function
        window.recordMouseOnlyClick();
      });
    });

    // Try to activate with Enter key - should NOT work before repair
    await page.keyboard.press('Enter');
    
    // Give time for any potential click to fire
    await page.waitForTimeout(100);
    
    expect(clickFired).toBe(false);
  });

  test('defective element responds to mouse click before repair', async ({ page }) => {
    const addButton = page.locator('[data-testid="defect-mouse-only"]');
    
    // Verify mouse click works (the defect is keyboard-only)
    await expect(addButton).toContainText('Add to Cart');
    
    // Try clicking using JavaScript evaluation to bypass any Playwright timing issues
    await addButton.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    
    // Small wait for React state update
    await page.waitForTimeout(100);
    
    // Should show "Added!" after click
    await expect(addButton).toContainText('Added!', { timeout: 5000 });
  });

  test('keyboard activation works after repair is applied', async ({ page }) => {
    // First discover the defect by focusing it
    const addButton = page.locator('[data-testid="defect-mouse-only"]');
    await addButton.focus();

    // Discover and apply the repair
    await page.click('button:has-text("Discover Defect")');
    await page.waitForTimeout(100);
    
    // Click the repair button for mouse-only
    await page.click('[data-testid="repair-mouse-only"]');
    await page.waitForTimeout(200);

    // Now test keyboard activation
    await addButton.focus();
    await expect(addButton).toBeFocused();

    // Reset the button state (wait for "Added!" to disappear)
    await page.waitForTimeout(2100);
    
    // Press Enter - should now work after repair
    await page.keyboard.press('Enter');
    
    // Should show "Added!" indicating keyboard activation worked
    await expect(addButton).toContainText('Added!');
  });

  test('repair adds role="button" attribute to div element', async ({ page }) => {
    const addButton = page.locator('[data-testid="defect-mouse-only"]');

    // Before repair - check it's a div without role
    const tagName = await addButton.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('div');
    
    const roleBefore = await addButton.getAttribute('role');
    expect(roleBefore).toBeNull();

    // Apply repair
    await addButton.focus();
    await page.click('button:has-text("Discover Defect")');
    await page.waitForTimeout(100);
    await page.click('[data-testid="repair-mouse-only"]');
    await page.waitForTimeout(100);

    // After repair - should have role="button"
    const roleAfter = await addButton.getAttribute('role');
    expect(roleAfter).toBe('button');
  });

  test('repair marks element with data-keyquest-repaired attribute', async ({ page }) => {
    const addButton = page.locator('[data-testid="defect-mouse-only"]');

    // Before repair
    const repairedBefore = await addButton.getAttribute('data-keyquest-repaired');
    expect(repairedBefore).toBeNull();

    // Apply repair
    await addButton.focus();
    await page.click('button:has-text("Discover Defect")');
    await page.waitForTimeout(100);
    await page.click('[data-testid="repair-mouse-only"]');
    await page.waitForTimeout(100);

    // After repair
    const repairedAfter = await addButton.getAttribute('data-keyquest-repaired');
    expect(repairedAfter).toBe('mouse-only');
  });

  test('Space key activates element after repair', async ({ page }) => {
    const addButton = page.locator('[data-testid="defect-mouse-only"]');

    // Apply repair
    await addButton.focus();
    await page.click('button:has-text("Discover Defect")');
    await page.waitForTimeout(100);
    await page.click('[data-testid="repair-mouse-only"]');
    await page.waitForTimeout(200);

    // Test Space key
    await addButton.focus();
    await page.keyboard.press('Space');
    
    // Should show "Added!"
    await expect(addButton).toContainText('Added!');
  });
});

test.describe('Emergency Exit During Challenge', () => {
  test('Escape key returns to main menu', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-challenge"]');
    
    // Verify we're in challenge
    await expect(page.locator('[data-testid="challenge-sandbox"]')).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Should return to menu
    await expect(page.locator('[data-testid="start-challenge"]')).toBeVisible();
    await expect(page.locator('[data-testid="challenge-sandbox"]')).not.toBeVisible();
  });

  test('Emergency exit button is visible and works', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-challenge"]');
    
    // Exit button should be visible
    const exitButton = page.locator('[data-testid="emergency-exit"]');
    await expect(exitButton).toBeVisible();
    
    // Click exit button
    await exitButton.click();
    
    // Should return to menu
    await expect(page.locator('[data-testid="start-challenge"]')).toBeVisible();
  });
});
