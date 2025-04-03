/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */

import { expect, test } from "@playwright/test";

/* eslint-disable no-process-env */
import { getBrowserState } from "../utils/browser-state";
import { mockWebsocket } from "../utils/mockWebsocket";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("does render", async ({ page }) => {
  await mockWebsocket(page, "getWorkflow.json");
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const kanvasBox = await page.locator("#kanvas").boundingBox();

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
});
