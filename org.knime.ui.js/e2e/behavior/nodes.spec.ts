/* eslint-disable no-undefined */
/* eslint-disable no-magic-numbers */
import { Page, test } from "@playwright/test";
import { Container, ContainerChild } from "pixi.js";

import {
  CustomWindow,
  assertSnapshot,
  getBrowserState,
  getKanvasBoundingBox,
  startApplication,
} from "../utils";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

const getPixiObjectCenter = (page: Page, labels: string[]) =>
  page.evaluate(
    ({ labels }) => {
      const pixiApp = (window as CustomWindow).__PIXI_APP__;

      let obj: Container<ContainerChild> | undefined = pixiApp.stage;

      labels.forEach(
        (label) => (obj = obj?.getChildByLabel(label, true) ?? undefined),
      );

      if (!obj) {
        throw new Error(
          `getPixiObjectCenter: pixi object not found, path: ${labels}`,
        );
      }

      const bounds = obj.getBounds();

      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
    },
    { labels },
  );

const getNodeTorsoCenter = (page: Page, nodeId: string) =>
  getPixiObjectCenter(page, [`Node__${nodeId}`, "NodeTorso"]);

const getNode1Position = async (page: Page): Promise<[number, number]> => {
  const kanvasBox = await getKanvasBoundingBox(page);
  const torso = await getNodeTorsoCenter(page, "root:1");

  return [kanvasBox!.x + torso.x, kanvasBox!.y + torso.y];
};

const getNode2Position = async (page: Page): Promise<[number, number]> => {
  const kanvasBox = await getKanvasBoundingBox(page);
  const torso = await getNodeTorsoCenter(page, "root:2");

  return [kanvasBox!.x + torso.x, kanvasBox!.y + torso.y];
};

const getNode3Position = async (page: Page): Promise<[number, number]> => {
  const kanvasBox = await getKanvasBoundingBox(page);
  const torso = await getNodeTorsoCenter(page, "root:4");

  return [kanvasBox!.x + torso.x, kanvasBox!.y + torso.y];
};

const start = (page: Page) =>
  startApplication(page, {
    workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    withMouseCursor: true,
  });

test.describe("selection", () => {
  test("selects only 1 node", async ({ page }) => {
    await start(page);

    // select a node
    await page.mouse.click(...(await getNode1Position(page)));
    await assertSnapshot(page);

    // select another node
    await page.mouse.click(...(await getNode2Position(page)));
    await assertSnapshot(page);
  });

  test("adds to selection if modifier is pressed", async ({ page }) => {
    await start(page);

    // select a node
    await page.mouse.click(...(await getNode1Position(page)));
    await assertSnapshot(page);

    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await assertSnapshot(page);
  });

  test("clicking unselected node selects only that node", async ({ page }) => {
    await start(page);

    // select a node
    await page.mouse.click(...(await getNode1Position(page)));
    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await assertSnapshot(page);

    // remove modifier and select another unselected node
    await page.keyboard.up("Shift");
    await page.mouse.click(...(await getNode3Position(page)));
    await assertSnapshot(page);
  });

  test("clicking selected node selects only that node", async ({ page }) => {
    await start(page);

    // select a node
    await page.mouse.click(...(await getNode1Position(page)));
    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await assertSnapshot(page);

    // remove modifier and select an already selected node
    await page.keyboard.up("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await assertSnapshot(page);
  });

  test("rectangle selection", async ({ page }) => {
    await start(page);
    const [node1X, node1Y] = await getNode1Position(page);
    const [node2X, node2Y] = await getNode2Position(page);

    // make a selection that covers 2 nodes
    // select a node
    await page.mouse.move(node1X - 50, node1Y - 50);
    await page.mouse.down();
    await page.mouse.move(node2X + 50, node2Y + 50);
    await assertSnapshot(page);

    await page.mouse.up();
    await assertSnapshot(page);
  });

  test("click on empty canvas clears selection", async ({ page }) => {
    await start(page);

    const [n1x, n1y] = await getNode1Position(page);

    // select nodes
    await page.mouse.click(n1x, n1y);
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await page.keyboard.up("Shift");

    await page.mouse.click(n1x - 200, n1y);
    await assertSnapshot(page);
  });
});

test.describe("dragging", () => {
  test("from unselected node", async ({ page }) => {
    await start(page);

    const [n1x, n1y] = await getNode1Position(page);

    // start an immediate drag from a pointer down without selecting first
    await page.mouse.move(n1x, n1y);
    await page.mouse.down();
    await page.mouse.move(n1x + 100, n1y - 100);
    await assertSnapshot(page);
  });

  test("from selected node", async ({ page }) => {
    await start(page);

    const [n1x, n1y] = await getNode1Position(page);

    // first select
    await page.mouse.click(n1x, n1y);

    // then move
    await page.mouse.down();
    await page.mouse.move(n1x + 100, n1y - 100);
    await assertSnapshot(page);
  });

  test("will replace selection when dragging from unselected node", async ({
    page,
  }) => {
    await start(page);

    // select 2 nodes
    await page.mouse.click(...(await getNode1Position(page)));
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNode2Position(page)));
    await page.keyboard.up("Shift");
    await assertSnapshot(page);

    // start an immediate drag from another node
    const [n3x, n3y] = await getNode3Position(page);
    await page.mouse.move(n3x, n3y);
    await page.mouse.down();
    await page.mouse.move(n3x + 100, n3y + 100);
    await assertSnapshot(page);
  });

  test("will respect multi-selection when dragging from selected node", async ({
    page,
  }) => {
    await start(page);

    // select 2 nodes
    await page.mouse.click(...(await getNode1Position(page)));
    await page.keyboard.down("Shift");
    const [n2x, n2y] = await getNode2Position(page);
    await page.mouse.click(n2x, n2y);
    await page.keyboard.up("Shift");

    // start an immediate drag from an already selected node
    await page.mouse.move(n2x, n2y);
    await page.mouse.down();
    await page.mouse.move(n2x + 100, n2y + 100);
    await assertSnapshot(page);
  });

  test("will ignore drag if multi-selection modifier is pressed", async ({
    page,
  }) => {
    await start(page);

    // select 2 nodes
    await page.mouse.click(...(await getNode1Position(page)));
    await page.keyboard.down("Shift");
    const [n2x, n2y] = await getNode2Position(page);
    await page.mouse.click(n2x, n2y);
    await page.keyboard.up("Shift");

    // start a drag with a modifier
    await page.mouse.move(n2x, n2y);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(n2x + 100, n2y + 100);
    await assertSnapshot(page);
  });
});
