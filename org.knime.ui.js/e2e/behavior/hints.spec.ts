/* eslint-disable no-magic-numbers */
import test, { Page, expect } from "@playwright/test";

import { getBrowserStorageState, getNode, startApplication } from "../utils";

const startForHints = (page: Page) =>
  startApplication(page, {
    withMouseCursor: true,
    workflowFixturePath: "connections/getWorkflow-connection-interactions.json",
  });

const hintSelector = ".hint-popover";
const waitForHint = (page: Page) => page.locator(hintSelector).waitFor();

test("shows hint at output port", async ({ browser }) => {
  const browserContext = await browser.newContext({
    storageState: getBrowserStorageState({
      hints: { skipAll: false, completedHints: ["node-monitor", "k-ai"] },
    }),
  });

  const page = await browserContext.newPage();

  const hintsNodeId = "root:16";

  await startForHints(page);

  const outPort = (await getNode(page, hintsNodeId)).outPorts[0];

  const hintPosition = await page
    .locator(`${hintSelector} .arrow`)
    .boundingBox();

  await waitForHint(page);

  // compare position of port and hint
  expect(Math.abs(outPort.x - hintPosition!.x)).toBeLessThan(10);
  expect(Math.abs(outPort.y - hintPosition!.y)).toBeLessThan(10);
});
