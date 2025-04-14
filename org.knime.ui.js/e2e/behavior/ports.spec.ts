import { test } from "@playwright/test";

import { testSimpleScreenshot } from "../utils";
import { getBrowserState } from "../utils/browserState";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("optional ports: render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "ports/getWorkflow-optional-ports.json",
  });
});
