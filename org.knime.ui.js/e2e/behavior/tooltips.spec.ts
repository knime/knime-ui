/* eslint-disable no-magic-numbers */
import test, { Page } from "@playwright/test";

import {
  assertSnapshot,
  getCenter,
  getNode,
  getNodeActionButtons,
  startApplication,
} from "../utils";

const startForTooltips = (page: Page) =>
  startApplication(page, {
    withMouseCursor: true,
    workflowFixturePath: "nodes/getWorkflow-node-with-error.json",
  });

const waitForTooltip = (page: Page) => page.getByTestId("tooltip").waitFor();

const tooltipNodeId = "root:1";

test("node state error tooltip is shown", async ({ page }) => {
  await startForTooltips(page);

  const nodeState = (await getNode(page, tooltipNodeId)).state!;

  await page.mouse.move(...getCenter(nodeState));

  await waitForTooltip(page);

  await assertSnapshot(page);
});

test("node state warning tooltip is shown and stays visible on hover", async ({
  page,
}) => {
  await startApplication(page, {
    withMouseCursor: true,
    workflowFixturePath: "nodes/getWorkflow-two-nodes-with-warnings.json",
  });

  const nodeState = (await getNode(page, tooltipNodeId)).state!;

  const nodeCenter = getCenter(nodeState);

  await page.mouse.move(...nodeCenter);

  await waitForTooltip(page);

  await page.getByTestId("tooltip").hover();

  await assertSnapshot(page);
});

test("ports have tooltips", async ({ page }) => {
  await startForTooltips(page);

  const port = (await getNode(page, tooltipNodeId)).outPorts[0];

  await page.mouse.move(...getCenter(port));

  await waitForTooltip(page);

  await assertSnapshot(page);
});

test("action buttons have tooltips", async ({ page }) => {
  await startForTooltips(page);

  // hover node to make action buttons visible
  const node = await getNode(page, tooltipNodeId);
  await page.mouse.move(...getCenter(node.torso));
  await page.waitForTimeout(200);

  // hover action button
  const actionButtons = await getNodeActionButtons(page, tooltipNodeId);
  await page.mouse.move(...getCenter(actionButtons[0]));

  await waitForTooltip(page);

  await assertSnapshot(page);
});

test("metanode / component show tooltip for cut off names", async ({
  page,
}) => {
  await startApplication(page, {
    withMouseCursor: true,
    workflowFixturePath: "nodes/getWorkflow-node-metanode-long-name.json",
  });

  const nodeName = (await getNode(page, tooltipNodeId)).name;
  await page.mouse.move(...getCenter(nodeName));
  await page.waitForTimeout(200);

  await waitForTooltip(page);

  await assertSnapshot(page);
});
