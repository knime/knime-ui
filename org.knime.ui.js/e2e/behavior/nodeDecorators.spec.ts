import { test } from "@playwright/test";

import { getBrowserState } from "../utils/browserState";
import { testSimpleScreenshot } from "../utils/testSimpleScreenshot";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("loop decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, "nodeDecorators/loopDecorators.json");
});

test("shared component decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, "nodeDecorators/sharedComponents.json");
});

test("locking and streaming component decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, "nodeDecorators/lockingAndStreaming.json");
});

test("streaming decorators on nodes render", async ({ page }) => {
  await testSimpleScreenshot(page, "nodeDecorators/streamingNodes.json");
});
