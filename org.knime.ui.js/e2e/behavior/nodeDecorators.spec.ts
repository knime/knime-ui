import { test } from "@playwright/test";

import { testSimpleScreenshot } from "../utils";
import { getBrowserState } from "../utils/browserState";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("loop decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "nodeDecorators/loopDecorators.json",
  });
});

test("shared component decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "nodeDecorators/sharedComponents.json",
  });
});

test("locking and streaming component decorators render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "nodeDecorators/lockingAndStreaming.json",
  });
});

test("streaming decorators on nodes render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "nodeDecorators/streamingNodes.json",
  });
});
