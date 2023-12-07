import { test, expect, chromium, Page, BrowserContext } from '@playwright/test';

interface PageClientParams {
  context: BrowserContext,
  name: string,
  hostPeerId: string
}

interface PageClient {
  peerId: string,
  page: Page,
}

/**
 * Opens a new page and connect to hosts if hostPeerId is provided.
 * @param {PageClientParams} params - The parameters for connecting the new page.
 * @returns {Promise<PageClient>} A promise that resolves to the connected page client.
 */
const connectNewPage = async ({ context, name, hostPeerId }: PageClientParams): Promise<PageClient> => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/');
  await page.locator('#input-name').fill(name);
  await page.locator('#button-name').click();
  const peerId = await page.locator('#roomId').innerText();

  if (hostPeerId) {
    await page.locator('#input-room').fill(hostPeerId);
    await page.locator('#button-room').click();
  }

  return { peerId, page }
}

/**
 * Executes a callback test function on each page in an array of pages and returns a promise that resolves when all callbacks have completed.
 * @param pages An array of pages.
 * @param cb The callback function to execute on each page.
 * @returns A promise that resolves when all callbacks have completed.
 */
const expectOnAllPages = (pages: Page[], cb: (page: Page) => any) => Promise.all(pages.map(cb));

async (pages: Page[], doTest: (page: Page) => Promise<any>) => {
  for (const page of pages) await doTest(page)
}

test('test', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const hostName = 'Host'
  const { peerId: hostPeerId, page: pageHost } = await connectNewPage({ context, name: hostName, hostPeerId: '' });

  // Expect connection with PeerJS server OK (has a peerId )
  expect(hostPeerId.length > 0).toBeTruthy();
  // Expect host is in the game without team
  expect(await pageHost.locator(`#player-${hostPeerId}.teamNone`).textContent()).toBe(hostName)

  const clientName = 'Client'
  expect(clientName).not.toBe(hostName)

  const { page: pageClient, peerId: clientPeerId } = await connectNewPage({ context, name: clientName, hostPeerId });
  expect(clientPeerId).not.toBe(hostPeerId);

  const pages = [pageClient, pageHost]

  // Expect players exists on both pages
  await expectOnAllPages(pages, async page => {
    expect(await page.locator(`#player-${hostPeerId}.teamNone`).textContent()).toBe(hostName)
    expect(await page.locator(`#player-${clientPeerId}.teamNone`).textContent()).toBe(clientName)
  })

  console.log('TESTS DONE');
});