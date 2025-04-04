/* eslint-disable no-magic-numbers */
import test, { Page, expect } from "@playwright/test";

import {
  getBrowserState,
  getKanvasBoundingBox,
  startApplication,
} from "../utils";

const maxDiffPixels = 350;

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

test("renders correcly", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-characters.json",
  });

  const kanvasBox = await getKanvasBoundingBox(page);

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});

test.describe("editing", () => {
  const startAnnotationEdit = async (page: Page) => {
    const kanvasBox = await getKanvasBoundingBox(page);
    const clickCoords = { x: kanvasBox!.x + 300, y: kanvasBox!.y + 220 };

    await page.mouse.dblclick(clickCoords.x, clickCoords.y);
    return { clickCoords };
  };

  test("content display remains consistent on edit", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    const kanvasBox = await getKanvasBoundingBox(page);

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });

    const { clickCoords } = await startAnnotationEdit(page);
    expect(page.getByTestId("rich-text-annotation-toolbar")).toBeVisible();
    await page.waitForTimeout(200);

    await page.keyboard.press("Escape");
    expect(page.getByTestId("rich-text-annotation-toolbar")).not.toBeVisible();

    await page.mouse.dblclick(clickCoords.x, clickCoords.y);
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });
  });

  test("can be edited", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    const kanvasBox = await getKanvasBoundingBox(page);

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });

    await startAnnotationEdit(page);

    // select all text
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("This is the new content");
    expect(page.getByRole("paragraph")).toContainText(
      "This is the new content",
    );

    // click somewhere outside annotation
    await page.mouse.dblclick(10, 10);
    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });
  });

  test("aborting edit reverts back to previous text", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    const kanvasBox = await getKanvasBoundingBox(page);

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });

    await startAnnotationEdit(page);

    // select all text
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("This is the new content");
    expect(page.getByRole("paragraph")).toContainText(
      "This is the new content",
    );

    // esc aborts edit
    await page.keyboard.press("Escape");
    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });
  });
});

test("can be transformed", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const kanvasBox = await getKanvasBoundingBox(page);
  const selectCoords = { x: kanvasBox!.x + 600, y: kanvasBox!.y + 500 };
  await page.mouse.click(selectCoords.x, selectCoords.y);

  const southEastTransform = { x: kanvasBox!.x + 625, y: kanvasBox!.y + 510 };

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });

  await page.mouse.move(southEastTransform.x, southEastTransform.y);
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(southEastTransform.x - 200, southEastTransform.y - 200);
  await page.mouse.up({ button: "left" });

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});

test("can be dragged", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const kanvasBox = await getKanvasBoundingBox(page);
  const selectCoords = { x: kanvasBox!.x + 350, y: kanvasBox!.y + 350 };

  await page.mouse.move(selectCoords.x, selectCoords.y);
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(selectCoords.x - 300, selectCoords.y - 100);
  await page.mouse.up();

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});

test("have context menu", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const kanvasBox = await getKanvasBoundingBox(page);
  const selectCoords = { x: kanvasBox!.x + 350, y: kanvasBox!.y + 350 };
  await page.mouse.click(selectCoords.x, selectCoords.y, { button: "right" });

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});
