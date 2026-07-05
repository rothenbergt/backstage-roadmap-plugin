import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end tests against the dev harness: real browser, real backend,
 * in-memory sqlite. Organized by persona.
 *
 * The dev app signs everyone in as guest, and guest is a roadmap admin
 * (app-config.yaml), so the browser can exercise visitor, contributor, and
 * admin flows. What guest-only auth cannot cover here - that non-admins are
 * denied admin actions - is covered by the backend persona contract tests
 * (plugins/roadmap-backend/src/routes/personaContract.test.ts).
 */

async function suggestFeature(page: Page, title: string, description: string) {
  await page.getByRole('button', { name: 'Suggest Feature' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Submit' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/roadmap');

  // Fresh browser contexts land on the guest sign-in page first
  const enterButton = page.getByRole('button', { name: 'Enter' });
  const boardHeading = page.getByRole('heading', { name: 'Public Roadmap' });
  await expect(enterButton.or(boardHeading)).toBeVisible();
  if (await enterButton.isVisible()) {
    await enterButton.click();
  }
  await expect(
    page.getByRole('heading', { name: 'Public Roadmap' }),
  ).toBeVisible();
});

test.describe('visitor: browses the board', () => {
  test('board renders the default columns', async ({ page }) => {
    for (const column of ['Suggested', 'Planned', 'Completed', 'Declined']) {
      await expect(
        page.getByText(column, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test('a shared deep link opens the feature drawer directly', async ({
    page,
  }) => {
    const title = `Shared link ${Date.now()}`;
    await suggestFeature(page, title, 'Deep link me');
    await page
      .getByRole('button', { name: `View details for ${title}` })
      .click();
    await expect(page).toHaveURL(/feature=/);
    const url = page.url();

    // A fresh visit to the copied URL restores the open drawer
    await page.goto(url);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Closing the drawer clears the param
    await page.getByRole('button', { name: 'close' }).click();
    await expect(page).not.toHaveURL(/feature=/);
  });
});

test.describe('contributor: suggests, votes, comments', () => {
  test('a suggested feature appears on the board', async ({ page }) => {
    const title = `Dark mode ${Date.now()}`;
    await suggestFeature(page, title, 'Support dark mode everywhere');

    await expect(page.getByText(title)).toBeVisible();
  });

  test('voting toggles on and off', async ({ page }) => {
    const title = `Votable ${Date.now()}`;
    await suggestFeature(page, title, 'Vote on me');

    const card = page.getByRole('button', {
      name: `View details for ${title}`,
    });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Add vote' }).click();
    await expect(card.getByRole('button', { name: 'Remove vote' })).toHaveText(
      '1',
    );

    await card.getByRole('button', { name: 'Remove vote' }).click();
    await expect(card.getByRole('button', { name: 'Add vote' })).toBeVisible();
  });

  test('comments can be posted from the details drawer', async ({ page }) => {
    const title = `Commentable ${Date.now()}`;
    const comment = `Great idea! ${Date.now()}`;
    await suggestFeature(page, title, 'Comment on me');

    await page
      .getByRole('button', { name: `View details for ${title}` })
      .click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.getByLabel('Add a comment').fill(comment);
    await page.getByRole('button', { name: 'Post Comment' }).click();

    await expect(page.getByText(comment)).toBeVisible();
  });
});

test.describe('admin: curates the board', () => {
  test('can move a feature to another column', async ({ page }) => {
    const title = `Movable ${Date.now()}`;
    await suggestFeature(page, title, 'Move me to Planned');

    await page
      .getByRole('button', { name: `View details for ${title}` })
      .click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Status select is only rendered for admins (guest is one in dev config)
    await page.getByRole('button', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Planned' }).click();

    await expect(page.getByRole('button', { name: 'Status' })).toHaveText(
      'Planned',
    );

    // The new status survives a full reload; the deep link URL still carries
    // the feature id, so the drawer reopens on its own
    await page.reload();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Status' })).toHaveText(
      'Planned',
    );
  });
});

test.describe('search: rich roadmap results', () => {
  test('a feature is findable and its result shows status, votes, and author', async ({
    page,
  }) => {
    // Unique term so the query can only match this test's feature
    const term = `Searchable${Date.now()}`;
    const title = `${term} export`;
    await suggestFeature(page, title, 'Let admins export the board as CSV');

    // Vote so the result has a non-zero count to show
    const card = page.getByRole('button', {
      name: `View details for ${title}`,
    });
    await card.getByRole('button', { name: 'Add vote' }).click();
    await expect(card.getByRole('button', { name: 'Remove vote' })).toHaveText(
      '1',
    );

    await page.goto('/search');
    const searchBox = page.getByRole('textbox');
    const resultLink = page.getByRole('link', { name: title });

    // The collator indexes every 10 seconds (app-config.yaml), and the
    // search context caches by term, so each retry reloads the page to get
    // a genuinely fresh query against the latest index.
    await expect(async () => {
      await page.goto('/search');
      await searchBox.fill(term);
      await expect(resultLink).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });

    // The rich list item shows board metadata, not just title and text
    const resultItem = page.getByRole('listitem').filter({ hasText: title });
    await expect(resultItem.getByText('Suggested')).toBeVisible();
    await expect(resultItem.getByLabel('1 votes')).toBeVisible();
    await expect(resultItem.getByText('guest')).toBeVisible();

    // Clicking the result deep-links straight into the feature drawer
    await resultLink.click();
    await expect(page).toHaveURL(/feature=/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });
});

test.describe('live updates: signals', () => {
  test('a new suggestion appears in another session without reloading', async ({
    page,
    browser,
  }) => {
    // A second, completely separate browser session watching the board
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await otherPage.goto('/roadmap');
    const enterButton = otherPage.getByRole('button', { name: 'Enter' });
    const heading = otherPage.getByRole('heading', { name: 'Public Roadmap' });
    await expect(enterButton.or(heading)).toBeVisible();
    if (await enterButton.isVisible()) {
      await enterButton.click();
    }
    await expect(heading).toBeVisible();

    // The first session suggests a feature
    const title = `Live update ${Date.now()}`;
    await suggestFeature(page, title, 'Broadcast me');
    await expect(page.getByText(title)).toBeVisible();

    // The watching session receives it via signals, with no reload
    await expect(otherPage.getByText(title)).toBeVisible({ timeout: 15_000 });

    await otherContext.close();
  });
});
