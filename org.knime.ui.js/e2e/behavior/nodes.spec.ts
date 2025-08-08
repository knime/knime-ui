/* eslint-disable no-magic-numbers */
import { Page, expect, test } from "@playwright/test";

import {
  assertSnapshot,
  executeUndo,
  getCenter,
  getKanvasBoundingBox,
  getNode,
  getNodePosition,
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

test("panning with right click doesn't open ctx menu", async ({ page }) => {
  await startForPointerInteractions(page);

  const [n1x, n1y] = await getNodePosition(page, IDS.node1);

  await page.mouse.move(n1x, n1y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(n1x + 300, n1y - 300);
  await page.mouse.up();
  await assertSnapshot(page);
});

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

  test("from selected node with zoom", async ({ page }) => {
    await startForPointerInteractions(page);

    const [n1x, n1y] = await getNodePosition(page, IDS.node1);

    // first select
    await page.mouse.click(n1x, n1y);

    // then move
    await page.mouse.down();
    await page.mouse.move(n1x + 100, n1y - 100);

    await page.keyboard.down("ControlOrMeta");
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -1);
    }
    await page.keyboard.up("ControlOrMeta");

    await page.mouse.move(n1x + 200, n1y - 200);

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
  const startForNodeReplacement = (
    page: Page,
    workflowCommandFn?: WorkflowCommandFnMock,
    workflowUndoCommand?: WorkflowUndoCommandMock,
  ) =>
    startApplication(page, {
      workflowFixturePath:
        "nodes/getWorkflow-node-interactions-replacement.json",
      withMouseCursor: true,
      workflowCommandFn,
      workflowUndoCommand,
    });

  test("should replace node", async ({ page }) => {
    await startForNodeReplacement(page, replaceNode);

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
    await startForNodeReplacement(page, replaceNode, {
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
    await assertSnapshot(page);

    await executeUndo(page);
    await assertSnapshot(page);
  });

  test("should abort node replacement", async ({ page }) => {
    await startForNodeReplacement(page);

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

  const getNodeName = async (
    page: Page,
    id: (typeof IDS)[keyof typeof IDS],
  ) => {
    const name = (await getNode(page, id)).name;
    return name;
  };

  [
    { name: "metanode", id: IDS.metanode },
    { name: "component", id: IDS.component },
  ].forEach(({ name, id }) => {
    test(`${name}::can edit name with dblclick->enter`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      await page.mouse.dblclick(...getCenter(await getNodeName(page, id)));
      await assertSnapshot(page);

      // save name
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      await assertSnapshot(page);
      expect((await getNodeName(page, id)).text).toBe("New name");
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
      await page.mouse.dblclick(...getCenter(await getNodeName(page, id)));
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
      await page.mouse.dblclick(...getCenter(await getNodeName(page, id)));
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await assertSnapshot(page);

      const saveButton = page.getByTestId("node-name-editor-save");
      await saveButton.click();
      // make sure editor is closed and text is on stage
      await page.waitForTimeout(300);
      await assertSnapshot(page);
      await expect((await getNodeName(page, id)).text).toBe("New name");
    });

    test(`${name}::cancels edit name with button`, async ({ page }) => {
      await startForNameChange(page);

      // start edit
      await page.mouse.dblclick(...getCenter(await getNodeName(page, id)));
      await waitForFloatingEditor(page);
      await page.keyboard.insertText("New name");
      await assertSnapshot(page);

      const cancelButton = page.getByTestId("node-name-editor-cancel");
      await cancelButton.click();
      // make sure editor is closed and text is on stage
      await page.waitForTimeout(200);
      await assertSnapshot(page);
      await expect((await getNodeName(page, id)).text).not.toBe("New name");
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

  const getNodeLabel = async (page: Page) => {
    const id = IDS.metanode;
    const label = (await getNode(page, id)).label!;
    return label;
  };

  const selectNode = async (page: Page) => {
    const [metanodeX, metanodeY] = await getNodePosition(page, IDS.metanode);
    return page.mouse.click(metanodeX, metanodeY);
  };

  test("can edit label with dblclick->Ctrl+enter", async ({ page }) => {
    await startForLabelChange(page);

    // start edit
    const [metanodeX, metanodeY] = getCenter(await getNodeLabel(page));
    await page.mouse.dblclick(metanodeX, metanodeY);
    await assertSnapshot(page);

    // save name
    await page.keyboard.insertText("New name");
    await page.waitForTimeout(5000);
    await page.keyboard.press("ControlOrMeta+Enter");
    await page.waitForTimeout(200);
    await assertSnapshot(page);
    await expect((await getNodeLabel(page)).text).toBe("New name");
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
    const [metanodeX, metanodeY] = getCenter(await getNodeLabel(page));
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
    const [metanodeX, metanodeY] = getCenter(await getNodeLabel(page));
    await page.mouse.dblclick(metanodeX, metanodeY);
    await waitForFloatingEditor(page);
    await page.keyboard.insertText("New name");
    await assertSnapshot(page);

    const cancelButton = page.getByTestId("node-label-editor-cancel");
    await cancelButton.click();
    page.waitForTimeout(200);
    await assertSnapshot(page);
    await expect((await getNodeLabel(page)).text).toBe("Add comment");
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
    await expect((await getNodeLabel(page)).text).toBe("New name");
  });
});
