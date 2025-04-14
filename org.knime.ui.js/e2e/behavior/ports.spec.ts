import { test } from "@playwright/test";

import { getBrowserState, testSimpleScreenshot } from "../utils";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("optional ports: render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "ports/getWorkflow-optional-ports.json",
  });
});

test("inactive ports: render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "ports/getWorkflow-inactive-ports.json",
  });
});
