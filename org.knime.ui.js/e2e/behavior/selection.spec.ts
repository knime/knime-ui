import test from "@playwright/test";
import { Page } from "playwright-core";

import {
  arrayToPoint,
  assertSnapshot,
  getAnnotation,
  getNodePosition,
  pointToArray,
  startApplication,
} from "../utils";

const IDS = {
  node1: "root:1",
  node2: "root:2",
  metanode: "root:4",
  component: "root:6",
  annotation1: "root_0",
  annotation2: "root_1",
} as const;

const start = async (page: Page) => {
  await startApplication(page, {
    workflowFixturePath: "getWorkflow-simple-workflow.json",
    withMouseCursor: true,
  });

  await page.getByTestId("zoom-input").click();
  await page.keyboard.insertText("50");
  await page.keyboard.press("Enter");
};

const selectMetanodeAndComponent = async (page: Page) => {
  const metanode = arrayToPoint(await getNodePosition(page, IDS.metanode));
  const component = arrayToPoint(await getNodePosition(page, IDS.component));
  await page.mouse.move(metanode.x - 50, metanode.y - 50);
  await page.mouse.down();
  await page.mouse.move(component.x + 50, component.y + 50);
  await page.mouse.up();

  return { metanode, component };
};

test.describe("selection rectangle", () => {
  test("selects objects", async ({ page }) => {
    await start(page);

    await selectMetanodeAndComponent(page);
    await assertSnapshot(page);
  });

  test("click on empty canvas clears selection", async ({ page }) => {
    await start(page);

    const { metanode } = await selectMetanodeAndComponent(page);

    await page.mouse.click(metanode.x - 50, metanode.y - 50);
    await assertSnapshot(page);
  });

  test("adds to selection via selection rectangle", async ({ page }) => {
    await start(page);

    await selectMetanodeAndComponent(page);
    const node1 = arrayToPoint(await getNodePosition(page, IDS.node1));

    await page.mouse.move(node1.x - 50, node1.y - 50);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(node1.x + 50, node1.y + 50);
    await assertSnapshot(page);

    await page.mouse.up();
    await assertSnapshot(page);
  });

  test("inverses selection", async ({ page }) => {
    await start(page);

    await selectMetanodeAndComponent(page);

    const node1 = arrayToPoint(await getNodePosition(page, IDS.node1));
    await page.keyboard.down("Shift");
    await page.mouse.click(node1.x, node1.y);

    await selectMetanodeAndComponent(page);
    await assertSnapshot(page);

    await page.keyboard.up("Shift");

    // add one annotation
    await page.keyboard.down("ControlOrMeta");
    const annotation = await getAnnotation(page, IDS.annotation1);
    await page.mouse.click(...pointToArray(annotation.center));
    await page.keyboard.up("ControlOrMeta");
    await assertSnapshot(page);

    // press Shift again and cover annotation to inverse its selection
    await page.keyboard.down("Shift");
    await page.mouse.move(
      ...pointToArray({ x: annotation.x - 20, y: annotation.y - 20 }),
    );
    await page.mouse.down({ button: "left" });

    await page.mouse.move(
      annotation.x + annotation.width + 20,
      annotation.y + annotation.height + 20,
    );

    await assertSnapshot(page);
  });

  test("annotation is selected only when fully covered", async ({ page }) => {
    await start(page);

    const annotation = await getAnnotation(page, IDS.annotation2);

    await page.mouse.move(
      ...pointToArray({ x: annotation.x - 20, y: annotation.y - 20 }),
    );
    await page.mouse.down({ button: "left" });
    await page.mouse.move(annotation.center.x, annotation.center.y);

    await assertSnapshot(page);

    await page.mouse.move(
      annotation.x + annotation.width + 20,
      annotation.y + annotation.height + 20,
    );

    await assertSnapshot(page);
  });
});

test("adds to selection via ctrl/shift", async ({ page }) => {
  await start(page);

  await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
  await page.keyboard.down("Shift");
  await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
  await page.keyboard.up("Shift");

  await assertSnapshot(page);
  await page.keyboard.down("ControlOrMeta");
  await page.mouse.click(...(await getNodePosition(page, IDS.component)));
  await page.mouse.click(
    ...pointToArray((await getAnnotation(page, IDS.annotation1)).center),
  );
  await page.mouse.click(
    ...pointToArray((await getAnnotation(page, IDS.annotation2)).center),
  );
  await page.mouse.click(...(await getNodePosition(page, IDS.node1)));

  await assertSnapshot(page);
});
