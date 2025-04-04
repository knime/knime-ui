/* eslint-disable no-magic-numbers */

import { expect, test } from "@playwright/test";

import { getBrowserState } from "../utils/browserState";
import { mockWebsocket } from "../utils/mockWebsocket";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("standard workflow: does render", async ({ page }) => {
  await mockWebsocket(page, "getWorkflow-non-std-spread-sheet.json");
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const kanvasBox = await page.locator("#kanvas").boundingBox();

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
});

test("interaction: zoom", async ({ page }) => {
  await mockWebsocket(page, "getWorkflow-non-std-spread-sheet.json");
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const kanvasBox = await page.locator("#kanvas").boundingBox();

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
