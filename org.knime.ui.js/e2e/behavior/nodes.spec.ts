/* eslint-disable no-magic-numbers */
import { Page, expect, test } from "@playwright/test";

import {
  assertSnapshot,
  getKanvasBoundingBox,
  getPixiObjectAttributes,
  getPixiObjectCenter,
  getPixiObjectCenterScreenCoordinates,
  pointToArray,
  startApplication,
  testSimpleScreenshot,
} from "../utils";
import { WorkflowCommandFnMock, WorkflowUndoCommandMock } from "../utils/types";

import {
  changeLabelCommand,
  changeNameCommand,
} from "./workflowCommandMocks/node-name-and-label";
import { nodeTranslate } from "./workflowCommandMocks/node-translate";
import { replaceNode } from "./workflowCommandMocks/replace-node";
import { undoNodePosition } from "./workflowUndoCommandMock/node-undo";
import { undoNodeReplace } from "./workflowUndoCommandMock/undo-node-replace";

const IDS = {
  node1: "root:1",
  node2: "root:2",
  metanode: "root:4",
  component: "root:6",
} as const;

const getNodePosition = async (
  page: Page,
  id: (typeof IDS)[keyof typeof IDS],
): Promise<[number, number]> => {
  const center = await getPixiObjectCenterScreenCoordinates(page, [
    `Node__${id}`,
    "NodeTorso",
  ]);

  return pointToArray(center);
};

const startForPointerInteractions = (
  page: Page,
  workflowCommandFn?: WorkflowCommandFnMock,
  workflowUndoCommand?: WorkflowUndoCommandMock,
) =>
  startApplication(page, {
    workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    withMouseCursor: true,
    workflowCommandFn,
    workflowUndoCommand,
  });

const executeUndo = async (page) => {
  await page.keyboard.press("ControlOrMeta+Z");
  await page.waitForTimeout(500);
};

test.describe("selection", () => {
  test("selects only 1 node", async ({ page }) => {
    await startForPointerInteractions(page);

    // select a node
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    await assertSnapshot(page);

    // select another node
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await assertSnapshot(page);
  });

  test("adds to selection if modifier is pressed", async ({ page }) => {
    await startForPointerInteractions(page);

    // select a node
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    await assertSnapshot(page);

    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await assertSnapshot(page);
  });

  test("clicking unselected node selects only that node", async ({ page }) => {
    await startForPointerInteractions(page);

    // select a node
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await assertSnapshot(page);

    // remove modifier and select another unselected node
    await page.keyboard.up("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.metanode)));
    await assertSnapshot(page);
  });

  test("clicking selected node selects only that node", async ({ page }) => {
    await startForPointerInteractions(page);

    // select a node
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    // select another node using the shift modifier
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await assertSnapshot(page);

    // remove modifier and select an already selected node
    await page.keyboard.up("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await assertSnapshot(page);
  });

  test("rectangle selection", async ({ page }) => {
    await startForPointerInteractions(page);
    const [node1X, node1Y] = await getNodePosition(page, IDS.node1);
    const [node2X, node2Y] = await getNodePosition(page, IDS.node2);

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
    await startForPointerInteractions(page);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);

    // select nodes
    await page.mouse.click(n1x, n1y);
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await page.keyboard.up("Shift");

    await page.mouse.click(n1x - 200, n1y);
    await assertSnapshot(page);
  });
});

test.describe("dragging", () => {
  test("from unselected node", async ({ page }) => {
    await startForPointerInteractions(page);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);

    // start an immediate drag from a pointer down without selecting first
    await page.mouse.move(n1x, n1y);
    await page.mouse.down();
    await page.mouse.move(n1x + 100, n1y - 100);
    await assertSnapshot(page);
  });

  test("from selected node", async ({ page }) => {
    await startForPointerInteractions(page);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);

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
    await startForPointerInteractions(page);

    // select 2 nodes
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    await page.keyboard.down("Shift");
    await page.mouse.click(...(await getNodePosition(page, IDS.node2)));
    await page.keyboard.up("Shift");
    await assertSnapshot(page);

    // start an immediate drag from another node
    const [n3x, n3y] = await getNodePosition(page, IDS.metanode);
    await page.mouse.move(n3x, n3y);
    await page.mouse.down();
    await page.mouse.move(n3x + 100, n3y + 100);
    await assertSnapshot(page);
  });

  test("will respect multi-selection when dragging from selected node", async ({
    page,
  }) => {
    await startForPointerInteractions(page);

    // select 2 nodes
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    await page.keyboard.down("Shift");
    const [n2x, n2y] = await getNodePosition(page, IDS.node2);
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
    await startForPointerInteractions(page);

    // select 2 nodes
    await page.mouse.click(...(await getNodePosition(page, IDS.node1)));
    await page.keyboard.down("Shift");
    const [n2x, n2y] = await getNodePosition(page, IDS.node2);
    await page.mouse.click(n2x, n2y);
    await page.keyboard.up("Shift");

    // start a drag with a modifier
    await page.mouse.move(n2x, n2y);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(n2x + 100, n2y + 100);
    await assertSnapshot(page);
  });

  test("undo node position", async ({ page }) => {
    const nodeId = IDS.node1;

    await startForPointerInteractions(page, nodeTranslate, {
      fn: undoNodePosition,
      data: { nodeId },
    });

    const [n1x, n1y] = await getNodePosition(page, nodeId);

    // first select node
    await page.mouse.click(n1x, n1y);

    // then move node
    await page.mouse.down();
    // keep this in sync with e2e/behavior/workflowCommandMocks/node-translate.ts
    await page.mouse.move(n1x + 100, n1y - 100);
    await page.mouse.up();

    // deselect node by click on empty kanvas
    const kanvas = await getKanvasBoundingBox(page);
    await page.mouse.click(kanvas!.x + 5, kanvas!.y + 5);
    await assertSnapshot(page);

    await executeUndo(page);
    await assertSnapshot(page);
  });
});

test.describe("node replacement", () => {
  test("should replace node", async ({ page }) => {
    await startForPointerInteractions(page, replaceNode);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);
    const [n2x, n2y] = await getNodePosition(page, IDS.node2);

    await page.mouse.move(n1x, n1y);
    await page.mouse.down();
    // move twice to better simulate a user interaction because
    // playwright moves the mouse immediately
    await page.mouse.move(n2x - 30, n2y - 30);
    await page.mouse.move(n2x - 20, n2y - 20);
    await assertSnapshot(page);

    await page.mouse.up();
    await assertSnapshot(page);
  });

  test("should undo node replacement", async ({ page }) => {
    await startForPointerInteractions(page, replaceNode, {
      fn: undoNodeReplace,
      data: {},
    });

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);
    const [n2x, n2y] = await getNodePosition(page, IDS.node2);

    await page.mouse.move(n1x, n1y);
    await page.mouse.down();
    // move twice to better simulate a user interaction because
    // playwright moves the mouse immediately
    await page.mouse.move(n2x - 30, n2y - 30);
    await page.mouse.move(n2x - 20, n2y - 20);
    await page.mouse.up();

    await executeUndo(page);
    await assertSnapshot(page);
  });

  test("should abort node replacement", async ({ page }) => {
    await startForPointerInteractions(page);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);
    const [n2x, n2y] = await getNodePosition(page, IDS.node2);

    await page.mouse.move(n1x, n1y);
    await page.mouse.down();
    // move twice to better simulate a user interaction because
    // playwright moves the mouse immediately
    await page.mouse.move(n2x - 30, n2y - 30);
    await page.mouse.move(n2x - 20, n2y - 20);
    await assertSnapshot(page);

    await page.keyboard.press("Escape");
    // double check that move again does not affect anything because of the abort
    await page.mouse.move(n2x - 10, n2y - 10);
    await assertSnapshot(page);

    await page.mouse.up();
    await assertSnapshot(page);
  });
});

test("node names render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "nodes/getWorkflow-node-name-rendering.json",
  });
});

const waitForFloatingEditor = (page: Page) =>
  page.waitForSelector(".canvas-floating-html", { state: "visible" });

test.describe("node name editing", () => {
  const startForNameChange = (page: Page) =>
    startApplication(page, {
      workflowFixturePath: "nodes/getWorkflow-node-interactions-rename.json",
      withMouseCursor: true,
      workflowCommandFn: changeNameCommand,
    });

  const getNodeNamePosition = async (
    page: Page,
    id: (typeof IDS)[keyof typeof IDS],
  ): Promise<[number, number]> => {
    const nodeNameCenter = await getPixiObjectCenterScreenCoordinates(page, [
      `Node__${id}`,
      "NodeName",
    ]);

    return pointToArray(nodeNameCenter);
  };

  const getNodeNameText = async (
    page: Page,
    id: (typeof IDS)[keyof typeof IDS],
  ) => {
    const obj = await getPixiObjectAttributes(
      page,
      [`Node__${id}`, "NodeNameText"],
      ["text"],
    );
    return obj.text;
  };

  [
    { name: "metanode", id: IDS.metanode },
    { name: "component", id: IDS.component },
  ].forEach(({ name, id }) => {
    test(`${name}::can edit name with dblclick->enter`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      const [metanodeX, metanodeY] = await getNodeNamePosition(page, id);
      await page.mouse.dblclick(metanodeX, metanodeY);
      await assertSnapshot(page);

      // save name
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      await assertSnapshot(page);
      expect(await getNodeNameText(page, id)).toBe("New name");
    });

    test(`${name}::can edit name with shift+F2->click-outside`, async ({
      page,
    }) => {
      await startForNameChange(page);

      const [metanodeX, metanodeY] = await getNodePosition(page, id);
      // select metanode
      await page.mouse.click(metanodeX, metanodeY);
      await page.keyboard.press("Shift+F2");
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await page.waitForTimeout(200);
      await assertSnapshot(page);

      // click-away
      await page.mouse.click(metanodeX - 150, metanodeY - 150);
      await page.waitForTimeout(200);
      await assertSnapshot(page);
    });

    test(`${name}::cancels edit name with Escape`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      const [metanodeX, metanodeY] = await getNodeNamePosition(page, id);
      await page.mouse.dblclick(metanodeX, metanodeY);
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await page.waitForTimeout(500);
      await assertSnapshot(page);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      await assertSnapshot(page);
    });

    test(`${name}::saves edit name with button`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      const [metanodeX, metanodeY] = await getNodeNamePosition(page, id);
      await page.mouse.dblclick(metanodeX, metanodeY);
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await assertSnapshot(page);

      const saveButton = page.getByTestId("node-name-editor-save");
      await saveButton.click();
      // make sure editor is closed and text is on stage
      await page.waitForTimeout(300);
      await assertSnapshot(page);
      await expect(await getNodeNameText(page, id)).toBe("New name");
    });

    test(`${name}::cancels edit name with button`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      const [metanodeX, metanodeY] = await getNodeNamePosition(page, id);
      await page.mouse.dblclick(metanodeX, metanodeY);
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await assertSnapshot(page);

      const cancelButton = page.getByTestId("node-name-editor-cancel");
      await cancelButton.click();
      // make sure editor is closed and text is on stage
      await page.waitForTimeout(200);
      await assertSnapshot(page);
      await expect(await getNodeNameText(page, id)).not.toBe("New name");
    });
  });
});

test.describe("node label editing", () => {
  const startForLabelChange = (page: Page) =>
    startApplication(page, {
      workflowFixturePath: "nodes/getWorkflow-node-interactions-rename.json",
      withMouseCursor: true,
      workflowCommandFn: changeLabelCommand,
    });

  const getNodeLabelPosition = async (
    page: Page,
  ): Promise<[number, number]> => {
    const kanvasBox = await getKanvasBoundingBox(page);
    const label = await getPixiObjectCenter(page, [
      `NodeLabel__${IDS.metanode}`,
    ]);

    return [kanvasBox!.x + label.x, kanvasBox!.y + label.y];
  };

  const getNodeLabelText = async (page: Page) => {
    const obj = await getPixiObjectAttributes(
      page,
      [`NodeLabel__${IDS.metanode}`, "NodeLabelText"],
      ["text"],
    );
    return obj.text;
  };

  const selectNode = async (page: Page) => {
    const [metanodeX, metanodeY] = await getNodePosition(page, IDS.metanode);
    return page.mouse.click(metanodeX, metanodeY);
  };

  test("can edit label with dblclick->Ctrl+enter", async ({ page }) => {
    await startForLabelChange(page);
    await selectNode(page);

    // start edit
    const [metanodeX, metanodeY] = await getNodeLabelPosition(page);
    await page.mouse.dblclick(metanodeX, metanodeY);
    await assertSnapshot(page);

    // save name
    await page.keyboard.insertText("New name");
    await page.waitForTimeout(5000);
    await page.keyboard.press("ControlOrMeta+Enter");
    await page.waitForTimeout(200);
    await assertSnapshot(page);
    await expect(await getNodeLabelText(page)).toBe("New name");
    await page.waitForTimeout(5000);
  });

  test("can edit label with F2->click-outside", async ({ page }) => {
    await startForLabelChange(page);
    await selectNode(page);

    const [metanodeX, metanodeY] = await getNodePosition(page, IDS.metanode);
    // select metanode
    await page.mouse.click(metanodeX, metanodeY);
    await page.keyboard.press("F2");
    await waitForFloatingEditor(page);
    await page.keyboard.insertText("New name");
    await assertSnapshot(page);

    // click-away
    await page.mouse.click(metanodeX - 150, metanodeY - 150);
    await page.waitForTimeout(200);
    await assertSnapshot(page);
  });

  test("cancels edit name with Escape", async ({ page }) => {
    await startForLabelChange(page);
    await selectNode(page);

    // start edit
    const [metanodeX, metanodeY] = await getNodeLabelPosition(page);
    await page.mouse.dblclick(metanodeX, metanodeY);
    await waitForFloatingEditor(page);
    await page.keyboard.insertText("New name");
    await assertSnapshot(page);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await assertSnapshot(page);
  });

  test("cancels edit label with button", async ({ page }) => {
    await startForLabelChange(page);
    await selectNode(page);

    // start edit
    const [metanodeX, metanodeY] = await getNodeLabelPosition(page);
    await page.mouse.dblclick(metanodeX, metanodeY);
    await waitForFloatingEditor(page);
    await page.keyboard.insertText("New name");
    await assertSnapshot(page);

    const cancelButton = page.getByTestId("node-label-editor-cancel");
    await cancelButton.click();
    page.waitForTimeout(200);
    await assertSnapshot(page);
    await expect(await getNodeLabelText(page)).toBe("Add comment");
  });

  test("can edit label with button", async ({ page }) => {
    await startForLabelChange(page);
    await selectNode(page);

    const [metanodeX, metanodeY] = await getNodePosition(page, IDS.metanode);
    // select metanode
    await page.mouse.click(metanodeX, metanodeY);
    await page.keyboard.press("F2");
    await waitForFloatingEditor(page);
    await page.keyboard.insertText("New name");
    await assertSnapshot(page);

    const saveButton = page.getByTestId("node-label-editor-save");
    await saveButton.click();
    await page.waitForTimeout(200);
    await assertSnapshot(page);
    await expect(await getNodeLabelText(page)).toBe("New name");
  });
});
