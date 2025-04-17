/* eslint-disable no-magic-numbers */
import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getKanvasBoundingBox,
  startApplication,
} from "../utils";
import { getBrowserState } from "../utils/browserState";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

const start = (page: Page) =>
  startApplication(page, {
    workflowFixturePath: "getWorkflow-non-std-spread-sheet.json",
  });

test("standard workflow: does render", async ({ page }) => {
  await start(page);
  await assertSnapshot(page);
});

test("zoom", async ({ page }) => {
  await start(page);
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
  await assertSnapshot(page);
});

test.describe("panning", () => {
  const getBlankCanvasPosition = async (
    page: Page,
  ): Promise<[number, number]> => {
    const kanvasBox = await getKanvasBoundingBox(page);
    return [kanvasBox!.x + 385, kanvasBox!.y + 100];
  };

  test("with middle click", async ({ page }) => {
    await start(page);

    const [startX, startY] = await getBlankCanvasPosition(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(startX + 300, startY - 300);
    await page.mouse.up();
    await assertSnapshot(page);
  });

  test("with right click", async ({ page }) => {
    await start(page);

    const [startX, startY] = await getBlankCanvasPosition(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(startX + 300, startY - 300);
    await page.mouse.up();
    await assertSnapshot(page);
  });
});
