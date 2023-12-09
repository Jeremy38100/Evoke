import test, { expect } from "@playwright/test";
import { connectTwoPages, getPlayerSelector } from "./tests.utils";


test('Disconnect client', async () => {
  const { pageClient, pageHost, clientPeerId, hostPeerId } = await connectTwoPages()
  await pageClient.reload()

  await pageHost.waitForSelector(getPlayerSelector(clientPeerId), { state: 'detached' });
  expect(pageHost.locator(getPlayerSelector(clientPeerId))).toHaveCount(0)
  expect(pageHost.locator(getPlayerSelector(hostPeerId))).toHaveCount(1)

});

test('Disconnect host', async () => {
  const { pageClient, pageHost, clientPeerId, hostPeerId } = await connectTwoPages()
  await pageHost.reload()

  await pageClient.waitForSelector(getPlayerSelector(hostPeerId), { state: 'detached' });
  expect(pageClient.locator(getPlayerSelector(clientPeerId))).toHaveCount(1)
});