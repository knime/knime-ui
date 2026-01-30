import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getKanvas,
  getNodePosition,
  startApplication,
} from "../utils";

import { componentAdd } from "./workflowCommandMocks/component-add";

test("quick action menu", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    workflowCommandFn: componentAdd({ x: 1075, y: 780 }),
  });

  const [n1x, n1y] = await getNodePosition(page, "root:1");
  await page.mouse.move(n1x + 20, n1y);
  await page.mouse.down();

  await page.mouse.move(n1x + 100, n1y - 100);
  await page.mouse.up();

  await page.getByText("Components").click();

  await page.getByPlaceholder(/search components/gi).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await assertSnapshot(page);
});

const activateTab = (page: Page) =>
  page.getByTestId("Nodes").click({ position: { x: 20, y: 20 } });

test("sidebar drag & drop", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
    workflowCommandFn: componentAdd({ x: 1075, y: 780 }),
  });

  await activateTab(page);
  await page.getByText("Components").click();

  await page.getByPlaceholder(/search components/gi).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await page
    .getByTestId("node-template")
    .getByText(/Style Transfer/gi)
    .first()
    .dragTo(getKanvas(page), {
      sourcePosition: { x: 15, y: 15 },
      targetPosition: { x: 120, y: 50 },
    });

  // navigation only works if the canvas has focus
  await page.keyboard.down("ArrowUp");
  await assertSnapshot(page);
});
