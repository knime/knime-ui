import { Page, test } from "@playwright/test";

import {
  assertSnapshot,
  getCenter,
  getComponentPlaceholder,
  startApplication,
} from "../utils";

const IDS = {
  componentPlaceholder1: "componentPlaceholder-1",
  componentPlaceholder2: "componentPlaceholder-2",
} as const;

const startForPointerInteractions = (page: Page) =>
  startApplication(page, {
    withMouseCursor: true,
    workflowFixturePath:
      "componentPlaceholder/getWorkflow-component-placeholder-rendering.json",
  });

test("renders correctly", async ({ page }) => {
  await startForPointerInteractions(page);

  await assertSnapshot(page);
});

test.describe("selection", () => {
  test("selects only 1 component placeholder", async ({ page }) => {
    await startForPointerInteractions(page);

    // select a component placeholder
    const componentPlaceholder = await getComponentPlaceholder(
      page,
      IDS.componentPlaceholder1,
    );

    await page.mouse.click(...getCenter(componentPlaceholder));
    await assertSnapshot(page);

    // select another component placeholder
    const componentPlaceholder2 = await getComponentPlaceholder(
      page,
      IDS.componentPlaceholder2,
    );

    await page.mouse.click(...getCenter(componentPlaceholder2));
    await assertSnapshot(page);
  });
});
