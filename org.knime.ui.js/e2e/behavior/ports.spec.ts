import { describe } from "node:test";

import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getAddPortPlaceholder,
  getCenter,
  getNode,
  getPortActionButton,
  startApplication,
  testSimpleScreenshot,
} from "../utils";
import { WorkflowCommandFnMock } from "../utils/types";

import {
  addCredentialPort,
  addTablePort,
  removeNodePort,
} from "./workflowCommandMocks/node-port-actions";

const NODE_IDS = {
  patchReq: "root:3",
  metanode: "root:6",
  component: "root:7",
  concat: "root:20",
};

const startWithInteraction = (
  page: Page,
  workflowCommandFn: WorkflowCommandFnMock,
  workflowFixturePath: string,
) => {
  return startApplication(page, {
    workflowFixturePath,
    workflowCommandFn,
    withMouseCursor: true,
  });
};

const getPortPosition = async (
  page: Page,
  nodeId: (typeof NODE_IDS)[keyof typeof NODE_IDS],
  side: "in" | "out",
  portIndex: number,
) => {
  const node = await getNode(page, nodeId);
  return getCenter(
    side === "in" ? node.inPorts[portIndex] : node.outPorts[portIndex],
  );
};

const getAddPortPlaceholderPosition = async (
  page: Page,
  nodeId: (typeof NODE_IDS)[keyof typeof NODE_IDS],
  side: "input" | "output",
) => {
  const addPortPlaceholder = await getAddPortPlaceholder(page, nodeId, side);
  return getCenter(addPortPlaceholder!);
};

test("optional ports: render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "ports/getWorkflow-optional-ports.json",
  });
});

test("inactive ports: render correctly", async ({ page }) => {
  await testSimpleScreenshot(page, {
    workflowFixturePath: "ports/getWorkflow-inactive-ports.json",
  });
});

describe("add/select/remove port", () => {
  const clickAwayOffset = 150;
  test("select and delete optional port concat node", async ({ page }) => {
    await startWithInteraction(
      page,
      removeNodePort,
      "ports/remove-optional-ports-concat.json",
    );
    // TODO: NXT-3719 in snapshots tooltip is showing (even after removing port) -> snapshots might have to get updated with NXT-3719
    await page.mouse.click(
      ...(await getPortPosition(
        page,
        NODE_IDS.concat,
        "in",
        2, // 3rd in port
      )),
    );
    await assertSnapshot(page);
    const actionButton = await getPortActionButton(
      page,
      NODE_IDS.concat,
      "In-3",
    );
    await page.mouse.click(...getCenter(actionButton));
    await assertSnapshot(page);
  });
  test("add optional port patch request", async ({ page }) => {
    await startWithInteraction(
      page,
      addCredentialPort,
      "ports/remove-optional-ports-patch-req.json",
    );
    const [inX, inY] = await getAddPortPlaceholderPosition(
      page,
      NODE_IDS.patchReq,
      "input",
    );
    await page.mouse.click(inX, inY);
    await assertSnapshot(page);
  });
  test("open port menu metanode", async ({ page }) => {
    await startApplication(page, {
      withMouseCursor: true,
      workflowFixturePath: "ports/remove-optional-ports-metanode.json",
    });
    const [inX, inY] = await getAddPortPlaceholderPosition(
      page,
      NODE_IDS.metanode,
      "input",
    );
    await page.mouse.click(inX, inY);
    await assertSnapshot(page);
    await page.mouse.click(inX + clickAwayOffset, inY); // click away port menu
    await page.mouse.click(
      ...(await getAddPortPlaceholderPosition(
        page,
        NODE_IDS.metanode,
        "output",
      )),
    );
    await assertSnapshot(page);
  });
  test("select port with traffic light", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "ports/remove-optional-ports-metanode.json",
    });
    await page.mouse.click(
      ...(await getPortPosition(page, NODE_IDS.metanode, "out", 0)),
    );
    await assertSnapshot(page);
  });
  test("open port menu component", async ({ page }) => {
    await startApplication(page, {
      withMouseCursor: true,
      workflowFixturePath: "ports/remove-optional-ports-component.json",
    });
    const [inX, inY] = await getAddPortPlaceholderPosition(
      page,
      NODE_IDS.component,
      "input",
    );
    await page.mouse.click(inX, inY);
    await assertSnapshot(page);
    await page.mouse.click(inX + clickAwayOffset, inY); // click away port menu
    await page.mouse.click(
      ...(await getAddPortPlaceholderPosition(
        page,
        NODE_IDS.component,
        "output",
      )),
    );
    await assertSnapshot(page);
  });
  test("use keyboard navigation", async ({ page }) => {
    await startWithInteraction(
      page,
      addTablePort,
      "ports/remove-optional-ports-concat.json",
    );
    const [x, y] = await getPortPosition(
      page,
      NODE_IDS.concat,
      "in",
      2, // 3rd in port
    );

    await page.mouse.click(x, y);
    await page.mouse.move(0, 0); // move away to avoid tooltip in snapshots
    await page.keyboard.press("ArrowUp");
    await assertSnapshot(page);
    await page.keyboard.press("ArrowRight");
    await assertSnapshot(page);
    await page.keyboard.press("ArrowLeft");
    await assertSnapshot(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await assertSnapshot(page);
    await page.keyboard.press("ArrowDown");
    await assertSnapshot(page);
  });

  test("open component port menu via keyboard navigation", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "ports/remove-optional-ports-component.json",
    });
    const [x, y] = await getPortPosition(page, NODE_IDS.component, "out", 0);

    await page.mouse.click(x, y);
    await page.mouse.move(0, 0); // move away to avoid tooltip

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await assertSnapshot(page);
  });
});
