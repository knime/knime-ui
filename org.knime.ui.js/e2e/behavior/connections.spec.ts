/* eslint-disable no-magic-numbers */
import test, { Page } from "@playwright/test";

import {
  assertSnapshot,
  getKanvasBoundingBox,
  getNodePosition,
  startApplication,
} from "../utils";

const start = (page: Page) =>
  startApplication(page, {
    workflowFixturePath: "connections/getWorkflow-connection-interactions.json",
    withMouseCursor: true,
  });

// Connection positions, unlike nodes, annotations, etc, are very tricky to
// calculate using pixi query methods, because connections are bezier curves
// so the interaction position could be any point along the curve. This is internally
// handled by the geometry of the pixi graphic and it's not exposed
const getConnectionPosition = async (page: Page) => {
  const kanvasBox = await getKanvasBoundingBox(page);
  return {
    x: kanvasBox!.x + 290,
    y: kanvasBox!.y + 300,
  };
};

test("connection can be selected", async ({ page }) => {
  await start(page);

  const { x, y } = await getConnectionPosition(page);

  await page.mouse.click(x, y);
  await assertSnapshot(page);
});

test("connection has context menu", async ({ page }) => {
  await start(page);
  const { x, y } = await getConnectionPosition(page);

  await page.mouse.click(x, y, { button: "right" });
  await assertSnapshot(page);
});

test.describe("bendpoints", () => {
  const getFirstBendpointPosition = async (page: Page) => {
    const kanvasBox = await getKanvasBoundingBox(page);
    return {
      x: kanvasBox!.x + 410,
      y: kanvasBox!.y + 180,
    };
  };

  test("can be dragged", async ({ page }) => {
    await start(page);

    const { x, y } = await getFirstBendpointPosition(page);

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y + 100);
    await assertSnapshot(page);
  });

  test("have context menu", async ({ page }) => {
    await start(page);

    // select a node first; context menu will clear selection
    await page.mouse.click(...(await getNodePosition(page, "root:16")));

    const { x, y } = await getFirstBendpointPosition(page);

    await page.mouse.click(x, y, { button: "right" });

    await assertSnapshot(page);
  });
});
