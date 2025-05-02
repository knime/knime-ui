/* eslint-disable no-magic-numbers */
import test, { Page } from "@playwright/test";

import {
  assertSnapshot,
  getPixiObjectCenterScreenCoordinates,
  pointToArray,
  startApplication,
} from "../utils";

test.describe("tooltips", () => {
  const startForTooltips = (page: Page) =>
    startApplication(page, {
      withMouseCursor: true,
      workflowFixturePath: "nodes/getWorkflow-node-with-error.json",
    });

  const waitForTooltip = (page: Page) => page.getByTestId("tooltip").waitFor();

  const tooltipNodeId = "root:1";

  test("node state error tooltip is shown", async ({ page }) => {
    await startForTooltips(page);

    const position = await getPixiObjectCenterScreenCoordinates(page, [
      `Node__${tooltipNodeId}`,
      "NodeState",
    ]);

    await page.mouse.move(...pointToArray(position));

    await waitForTooltip(page);

    await assertSnapshot(page);
  });

  test("ports have tooltips", async ({ page }) => {
    await startForTooltips(page);

    const position = await getPixiObjectCenterScreenCoordinates(page, [
      `Node__${tooltipNodeId}`,
      "Port__Out-1",
    ]);

    await page.mouse.move(...pointToArray(position));

    await waitForTooltip(page);

    await assertSnapshot(page);
  });

  test("action buttons have tooltips", async ({ page }) => {
    await startForTooltips(page);

    // hover node to make action buttons visible
    const nodePosition = await getPixiObjectCenterScreenCoordinates(page, [
      `Node__${tooltipNodeId}`,
      "NodeTorso",
    ]);
    await page.mouse.move(...pointToArray(nodePosition));
    await page.waitForTimeout(200);

    // hover action button
    const position = await getPixiObjectCenterScreenCoordinates(page, [
      `Node__${tooltipNodeId}`,
      "ActionButton",
    ]);
    await page.mouse.move(...pointToArray(position));

    await waitForTooltip(page);

    await assertSnapshot(page);
  });
});
