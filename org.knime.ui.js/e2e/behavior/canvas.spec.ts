/* eslint-disable no-magic-numbers */

import { expect, test } from "@playwright/test";

import { getKanvasBoundingBox, startApplication } from "../utils";
import { getBrowserState } from "../utils/browserState";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("standard workflow: does render", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "getWorkflow-non-std-spread-sheet.json",
  });

  const kanvasBox = await getKanvasBoundingBox(page);

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
});

test("interaction: zoom", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "getWorkflow-non-std-spread-sheet.json",
  });
  const kanvasBox = await getKanvasBoundingBox(page);

  await page.mouse.move(
    kanvasBox!.x + kanvasBox!.width / 2 + 10,
    kanvasBox!.y + kanvasBox!.height / 2 + 20,
  );
  await page.keyboard.down("ControlOrMeta");
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, -1);
  }
  await page.keyboard.up("ControlOrMeta");

  await page.waitForTimeout(200);

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
});
