import { test } from "@playwright/test";

import { testSimpleScreenshot } from "../utils";

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
