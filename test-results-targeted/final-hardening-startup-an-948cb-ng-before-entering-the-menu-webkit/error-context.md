# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-hardening.spec.ts >> startup announces loading before entering the menu
- Location: tests\e2e\final-hardening.spec.ts:4:1

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not []

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to main content" [ref=e4]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e14]:
        - heading "KeyQuest" [level=1] [ref=e15]
        - generic [ref=e16]: The Haunted Accessibility Lab
      - generic [ref=e17]: Shell WCAG 2.1 AA
  - main [ref=e21]:
    - generic [ref=e22]:
      - region "Welcome to KeyQuest" [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e31]: "CASE FILE #A11Y-01 · LEVEL 1: THE MIDNIGHT CHECKOUT"
          - heading "Welcome to KeyQuest" [level=2] [ref=e32]
          - paragraph [ref=e33]: Enter the Midnight Checkout — a haunted apothecary storefront where four real accessibility curses trap keyboard, screen reader, and low-vision shoppers. Inspect the broken interface, apply code-backed DOM and CSS repairs, verify each improvement, and escape before the shop closes!
        - generic [ref=e34]:
          - button "Start Challenge" [ref=e35] [cursor=pointer]:
            - generic [aria-hidden] [ref=e37]: →
          - paragraph [ref=e38]:
            - text: "Keyboard ready: Press"
            - generic [ref=e39]: Enter
            - text: or
            - generic [ref=e40]: Space
            - text: to begin · Press
            - generic [ref=e41]: Escape
            - text: anytime to exit safely
      - region "Mission briefing and controls" [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [aria-hidden] [ref=e45]: 🧭
            - heading "1. Your Mission" [level=3] [ref=e46]
          - paragraph [ref=e47]:
            - text: Explore the cursed
            - strong [ref=e48]: Midnight Checkout
            - text: sandbox and locate four accessibility barriers that prevent real users from completing a purchase.
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [aria-hidden] [ref=e51]: ⌨️
            - heading "2. Keyboard Challenge" [level=3] [ref=e52]
          - paragraph [ref=e53]:
            - text: Test controls using
            - generic [ref=e54]: Tab
            - text: ","
            - generic [ref=e55]: Shift
            - text: +
            - generic [ref=e56]: Tab
            - text: ","
            - generic [ref=e57]: Enter
            - text: ", and"
            - generic [ref=e58]: Space
            - text: . Apply real DOM & CSS patches in the
            - strong [ref=e59]: Repair Studio
            - text: and watch live verification pass.
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [aria-hidden] [ref=e62]: 🛟
            - heading "3. Help & Safe Exit" [level=3] [ref=e63]
          - paragraph [ref=e64]:
            - text: Stuck on a curse? Use the
            - strong [ref=e65]: 3-level Hint System
            - text: with zero penalty. Press
            - generic [ref=e66]: Escape
            - text: or click
            - strong [ref=e67]: Exit
            - text: at any time to leave the sandbox with your progress saved.
      - region "Four Accessibility Curses to Break" [ref=e68]:
        - generic [ref=e69]:
          - heading "Four Accessibility Curses to Break" [level=3] [ref=e70]
          - generic [ref=e71]: Verified via real browser DOM & computed style checks
        - list [ref=e72]:
          - listitem [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e75]: WCAG 2.4.7
              - generic [ref=e76]: Level AA
            - strong [ref=e77]: Invisible Focus
            - generic [ref=e78]: "Focus outline stripped with outline: none"
          - listitem [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]: WCAG 2.1.1
              - generic [ref=e82]: Level A
            - strong [ref=e83]: Mouse-Only Activation
            - generic [ref=e84]: Clickable <div> ignores Enter & Space keys
          - listitem [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]: WCAG 4.1.2
              - generic [ref=e88]: Level A
            - strong [ref=e89]: Missing Accessible Name
            - generic [ref=e90]: Icon-only cart button announces nothing
          - listitem [ref=e91]:
            - generic [ref=e92]:
              - generic [ref=e93]: WCAG 1.4.3
              - generic [ref=e94]: Level AA
            - strong [ref=e95]: Insufficient Contrast
            - generic [ref=e96]: Faint price text fails 4.5:1 minimum contrast
      - generic [ref=e97]:
        - heading "Accessibility Notice & Sandbox Containment" [level=3] [ref=e98]:
          - generic [aria-hidden] [ref=e99]: ⚠️
          - text: Accessibility Notice & Sandbox Containment
        - paragraph [ref=e100]:
          - text: This game contains intentional accessibility defects within a clearly marked sandbox for educational purposes. The surrounding game shell, navigation, hint panel, and repair studio remain fully accessible (WCAG 2.1 Level AA). Press
          - generic [ref=e101]: Escape
          - text: at any time to exit the challenge.
  - contentinfo [ref=e102]:
    - generic [ref=e103]:
      - generic [ref=e104]:
        - paragraph [ref=e105]: "KeyQuest: The Haunted Accessibility Lab — An educational game about web accessibility."
        - paragraph [ref=e106]: "App Shell: WCAG 2.1 AA Verified · Keyboard-First · Zero Audio Required"
      - 'button "Reduced Motion: Off" [ref=e108] [cursor=pointer]':
        - generic [aria-hidden] [ref=e109]: ✨
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | test('startup announces loading before entering the menu', async ({ page }) => {
  5  |   await page.addInitScript(() => {
  6  |     const records: string[] = [];
  7  |     (window as unknown as { loadingRecords: string[] }).loadingRecords = records;
  8  |     new MutationObserver(() => {
  9  |       document.querySelectorAll('[role="status"][aria-live]').forEach(el => {
  10 |         if (/loading/i.test(el.textContent || '')) records.push(el.textContent || '');
  11 |       });
  12 |     }).observe(document, { childList: true, subtree: true });
  13 |   });
  14 |   await page.goto('/');
  15 |   await expect(page.getByTestId('start-challenge')).toBeVisible();
> 16 |   expect(await page.evaluate(() => (window as unknown as { loadingRecords: string[] }).loadingRecords)).not.toEqual([]);
     |                                                                                                             ^ Error: expect(received).not.toEqual(expected) // deep equality
  17 | });
  18 | 
  19 | test('reset dialog and hint panel have accessible names and pass axe', async ({ page }) => {
  20 |   await page.goto('/');
  21 |   await page.getByTestId('start-challenge').click();
  22 |   await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  23 |   await page.getByTestId('hint-button').click();
  24 |   expect((await new AxeBuilder({ page }).include('[data-testid="hint-panel"]').analyze()).violations).toEqual([]);
  25 |   await page.getByTestId('reset-button').click();
  26 |   await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
  27 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  28 | });
  29 | 
  30 | test('repair feedback retains keyboard focus after verification', async ({ page }) => {
  31 |   await page.goto('/');
  32 |   await page.getByTestId('start-challenge').click();
  33 |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  34 |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  35 |   await page.getByTestId('repair-invisible-focus').focus();
  36 |   await page.keyboard.press('Enter');
  37 |   await expect(page.getByText('Live DOM Verification Passed')).toBeVisible();
  38 |   await expect(page.locator(':focus')).toContainText('Live DOM Verification Passed');
  39 | });
  40 | 
  41 | test('failed focus verification reports incomplete repair and awards no progress', async ({ page }) => {
  42 |   await page.goto('/');
  43 |   await page.getByTestId('start-challenge').click();
  44 |   await page.addStyleTag({ content: '[data-testid="defect-invisible-focus"]:focus { outline: none !important; box-shadow: none !important; }' });
  45 |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  46 |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  47 |   await page.getByTestId('repair-invisible-focus').click();
  48 |   await expect(page.getByText('Verification Pending / Incomplete')).toBeVisible();
  49 |   await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
  50 |   await expect(page.getByText('Live DOM Verification Passed')).toHaveCount(0);
  51 | });
  52 | 
```