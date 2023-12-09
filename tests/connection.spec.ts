import { test } from '@playwright/test';
import { connectTwoPages } from './tests.utils';

test('Connect a client to a host', async () => {
  await connectTwoPages()
});