/* eslint-disable no-magic-numbers */
import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getAnnotation,
  getCenter,
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

  test("by dragging a node to the corner of the canvas (zoomed in)", async ({
    page,
  }) => {
    await startApplication(page, {
      workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    });

    // Zoom in
    await page.getByTestId("canvas-tool-zoom-in").click();
    await page.getByTestId("canvas-tool-zoom-in").click();

    const kanvasBox = await getKanvasBoundingBox(page);

    // Drag a node near edge of screen and hold until pan is made
    const [n1x, n1y] = await getNodePosition(page, "root:1");
    await page.mouse.move(n1x, n1y);
    await page.mouse.down();

    const panDistance = 100;
    for (let i = 0; i < panDistance; i++) {
      await page.mouse.move(kanvasBox!.x + kanvasBox!.width - 30, n1y);
    }

    // Drag away from the corner and drop
    await page.mouse.move(kanvasBox!.x + kanvasBox!.width - 160, n1y);
    await page.mouse.up();

    await assertSnapshot(page);
  });

  test("by dragging an annotation to the corner of the canvas (zoomed out)", async ({
    page,
  }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    // Zoom out
    await page.getByTestId("canvas-tool-zoom-out").click();
    await page.getByTestId("canvas-tool-zoom-out").click();

    const kanvasBox = await getKanvasBoundingBox(page);

    // Drag an annotation near top-left corner of screen and hold until edge of canvas is reached
    const annotation = await getAnnotation(page, "root_0");
    await page.mouse.click(...getCenter(annotation));
    await page.mouse.move(...getCenter(annotation));
    await page.mouse.down();
    const panDistance = 100;
    for (let i = 0; i < panDistance; i++) {
      await page.mouse.move(kanvasBox!.x + 20, kanvasBox!.y + 20);
    }

    // Drop
    await page.mouse.up();

    await assertSnapshot(page);
  });

  test("by dragging a bendpoint to the edge of the canvas", async ({
    page,
  }) => {
    await startApplication(page, {
      workflowFixturePath:
        "connections/getWorkflow-connection-interactions.json",
    });

    const kanvasBox = await getKanvasBoundingBox(page);

    // Drag a bendpoint near left edge of screen and hold until edge of canvas is reached
    const { x, y } = { x: kanvasBox!.x + 410, y: kanvasBox!.y + 180 };
    await page.mouse.move(x, y);
    await page.mouse.down();
    const panDistance = 100;
    for (let i = 0; i < panDistance; i++) {
      await page.mouse.move(kanvasBox!.x + 20, y);
    }

    // Drop
    await page.mouse.up();

    await assertSnapshot(page);
  });

  test("by dragging a mix of nodes and annotations to the edge of the canvas", async ({
    page,
  }) => {
    await start(page);

    const kanvasBox = await getKanvasBoundingBox(page);

    // Select annotation
    const annotation = await getAnnotation(page, "root_3");
    await page.mouse.click(annotation.center.x, annotation.center.y - 100);

    // Multiselect some nodes as well
    const [n1x, n1y] = await getNodePosition(page, "root:19");
    await page.mouse.move(n1x - 50, n1y - 50);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(n1x + 210, n1y + 80);
    await page.mouse.up();
    await page.keyboard.up("Shift");

    // Drag selected objects near bottom edge of screen and hold until edge of canvas is reached
    await page.mouse.move(annotation.center.x, annotation.center.y - 100);
    await page.mouse.down();
    const panDistance = 100;
    for (let i = 0; i < panDistance; i++) {
      await page.mouse.move(
        annotation.center.x,
        kanvasBox!.y + kanvasBox!.height - 20,
      );
    }

    // Drag away from the edge, drop
    await page.mouse.move(
      annotation.center.x,
      kanvasBox!.y + kanvasBox!.height - 300,
    );
    await page.mouse.up();

    await assertSnapshot(page, 300);
  });

  test("by dragging a port to the edge of the canvas", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    });

    const kanvasBox = await getKanvasBoundingBox(page);

    // Drag a port near right edge of screen and hold until edge of canvas is reached
    const [n1x, n1y] = await getNodePosition(page, "root:2");
    await page.mouse.move(n1x + 25, n1y);
    await page.mouse.down();

    const panDistance = 100;
    for (let i = 0; i < panDistance; i++) {
      await page.mouse.move(kanvasBox!.x + kanvasBox!.width - 20, n1y - 150);
    }

    // Drag away from the corner and drop
    await page.mouse.move(
      kanvasBox!.x + kanvasBox!.width - 600,
      kanvasBox!.y + 100,
    );
    await page.mouse.up();

    await assertSnapshot(page);
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
