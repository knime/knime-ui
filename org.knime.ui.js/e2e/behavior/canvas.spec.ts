/* eslint-disable no-magic-numbers */
import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getKanvasBoundingBox,
  getMinimapCoordinates,
  getNodePosition,
  startApplication,
} from "../utils";

const start = (page: Page) =>
  startApplication(page, {
    workflowFixturePath: "getWorkflow-non-std-spread-sheet.json",
  });

test("standard workflow: does render", async ({ page }) => {
  await start(page);
  await assertSnapshot(page);
});

// TODO: fix this test
test.skip("zoom", async ({ page }) => {
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

  await page.waitForTimeout(1000);
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

  const mouseButtons = ["left", "right", "middle"] as const;
  mouseButtons.forEach((button) => {
    test(`pan mode, pan with ${button} mouse button`, async ({ page }) => {
      await startApplication(page, {
        workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
        withMouseCursor: true,
      });

      await page.getByTestId("canvas-tool-pan-mode").click();

      const [nodeX, nodeY] = await getNodePosition(page, "root:1");

      await page.mouse.move(nodeX, nodeY);
      await page.mouse.down({ button });
      await page.mouse.move(nodeX + 300, nodeY - 300);
      await page.mouse.up();

      await assertSnapshot(page);
    });
  });
});

const startForMinimap = (page: Page) =>
  startApplication(page, {
    workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    withMouseCursor: true,
  });

test.describe("minimap", () => {
  test("can pan using camera", async ({ page }) => {
    await startForMinimap(page);

    const { camera } = await getMinimapCoordinates(page);

    await assertSnapshot(page);
    await page.mouse.move(camera!.x, camera!.y);
    await page.mouse.down();
    await page.mouse.move(camera!.x + 10, camera!.y + 10);
    await page.mouse.up();

    await assertSnapshot(page);
  });

  test("can pan clicking outside camera", async ({ page }) => {
    await startForMinimap(page);

    const { minimap } = await getMinimapCoordinates(page);

    await assertSnapshot(page);
    await page.mouse.move(minimap!.x + 10, minimap!.y + 10);
    await page.mouse.down();
    await assertSnapshot(page);

    await page.mouse.move(minimap!.x + 40, minimap!.y + 40);
    await page.mouse.up();
    await assertSnapshot(page);
  });
});

test.describe("canvas tools", () => {
  test("zoom in/out", async ({ page }) => {
    await startForMinimap(page);

    await assertSnapshot(page);
    await page.getByTestId("canvas-tool-zoom-out").click();
    await page.getByTestId("canvas-tool-zoom-out").click();

    await assertSnapshot(page);
    await page.getByTestId("canvas-tool-zoom-in").click();
    await page.getByTestId("canvas-tool-zoom-in").click();
    await page.getByTestId("canvas-tool-zoom-in").click();
    await page.getByTestId("canvas-tool-zoom-in").click();
    await assertSnapshot(page);
  });

  test("pan mode", async ({ page }) => {
    await startForMinimap(page);

    await page.getByTestId("canvas-tool-pan-mode").click();

    await assertSnapshot(page);

    const kanvasBox = await getKanvasBoundingBox(page);

    await page.mouse.move(
      kanvasBox!.x + kanvasBox!.width / 2 + 10,
      kanvasBox!.y + kanvasBox!.height / 2 + 20,
    );

    await page.mouse.down();
    await page.mouse.move(
      kanvasBox!.x + kanvasBox!.width / 2 + 100,
      kanvasBox!.y + kanvasBox!.height / 2 + 200,
    );
    await page.mouse.up();

    await assertSnapshot(page);
  });

  test("toggle minimap", async ({ page }) => {
    await startForMinimap(page);

    await page.getByTestId("canvas-tool-minimap-toggle").click();
    await assertSnapshot(page);

    await page.getByTestId("canvas-tool-minimap-toggle").click();
    await assertSnapshot(page);
  });
});
