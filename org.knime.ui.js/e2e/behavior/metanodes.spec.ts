import { test } from "@playwright/test";

import { testSimpleScreenshot } from "../utils";

test("metanode states render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "metanode/metanodes.json",
  });
});

test("port bars render", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "metanode/portBars.json",
  });
});
