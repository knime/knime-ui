import { Page, test } from "@playwright/test";

import { assertSnapshot, getKanvas, startApplication } from "../utils";

import { nodeAdd } from "./workflowCommandMocks/node-add";

test.describe("node repository", () => {
  test("canvas has focus after drop from node repository", async ({
    page,
  }: {
    page: Page;
  }) => {
    await startApplication(page, {
      workflowFixturePath: "nodes/getWorkflow-node-interactions.json",
      workflowCommandFn: nodeAdd,
    });

    await page.getByTestId("Nodes").click({ position: { x: 20, y: 20 } });

    await page
      .getByTestId("node-template")
      .first()
      .dragTo(getKanvas(page), {
        sourcePosition: { x: 15, y: 15 },
        targetPosition: { x: 120, y: 50 },
      });

    // navigation only works if the canvas has focus
    await page.keyboard.down("ArrowUp");

    await assertSnapshot(page);
  });
});
