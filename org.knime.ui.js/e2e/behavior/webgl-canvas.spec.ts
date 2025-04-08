/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */

import { expect, test } from "@playwright/test";
import { getComparator } from "playwright-core/lib/utils";

/* eslint-disable no-process-env */
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

test.describe("annotations", () => {
  test("renders correcly", async ({ page }) => {
    await mockWebsocket(page, "getWorkflow-annotation-characters.json");
    await page.goto("/");

    await page.waitForSelector('body[data-first-render="done"]');

    const kanvasBox = await page.locator("#kanvas").boundingBox();

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels: 350,
    });
  });

  test("content display remains consistent on edit", async ({ page }) => {
    await mockWebsocket(page, "getWorkflow-annotation-editing.json");
    await page.goto("/");

    await page.waitForSelector('body[data-first-render="done"]');

    const kanvasBox = await page.locator("#kanvas").boundingBox();

    const annotatiolToolbarSelector =
      '[data-test-id="rich-text-annotation-toolbar"]';
    const hideToolbarStyle = `${annotatiolToolbarSelector} { display: none; }`;

    const beforeImage = await page.screenshot({
      path: "./e2e/screenshots/before.png",
      clip: kanvasBox!,
    });

    const clickCoords = { x: kanvasBox!.x + 300, y: kanvasBox!.y + 220 };

    // put in edit mode
    await page.mouse.dblclick(clickCoords.x, clickCoords.y);
    expect(page.getByTestId("rich-text-annotation-toolbar")).toBeVisible();
    await page.waitForTimeout(200);

    await page.keyboard.press("Escape");
    expect(page.getByTestId("rich-text-annotation-toolbar")).not.toBeVisible();

    await page.mouse.dblclick(clickCoords.x, clickCoords.y);
    await page.waitForTimeout(200);

    const afterImage = await page.screenshot({
      path: "./e2e/screenshots/after.png",
      clip: kanvasBox!,
      style: hideToolbarStyle,
    });

    const comparator = getComparator("image/png");
    expect(
      comparator(beforeImage, afterImage, { maxDiffPixels: 200 }),
    ).toBeNull();
  });
});
