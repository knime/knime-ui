/* eslint-disable no-magic-numbers */
import test, { Page, expect } from "@playwright/test";

import {
  getAnnotation,
  getCenter,
  getKanvasBoundingBox,
  startApplication,
} from "../utils";

import { annotationBringToFront } from "./workflowCommandMocks/annotation-bring-to-front";

const maxDiffPixels = 350;

test("renders correctly", async ({ page }) => {
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
    const annotation = await getAnnotation(page, "root_0");

    await page.mouse.dblclick(...getCenter(annotation));
    await page.waitForTimeout(200);
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

    await startAnnotationEdit(page);
    await expect(
      page.getByTestId("rich-text-annotation-toolbar"),
    ).toBeVisible();

    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels,
    });

    await page.keyboard.press("Escape");
    await expect(
      page.getByTestId("rich-text-annotation-toolbar"),
    ).not.toBeVisible();
  });

  test("can be edited", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    await startAnnotationEdit(page);

    // select all text
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("This is the new content");
    await expect(page.getByRole("paragraph")).toContainText(
      "This is the new content",
    );
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
    await page.waitForTimeout(200);
    await expect(page.getByRole("paragraph")).toContainText(
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

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.click(...getCenter(annotation));

  const southEastTransform = {
    x: annotation.x + annotation.width + 3,
    y: annotation.y + annotation.height + 3,
  };

  const kanvasBox = await getKanvasBoundingBox(page);
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

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x - 300, annotation.center.y - 100);
  await page.mouse.up();

  const kanvasBox = await getKanvasBoundingBox(page);
  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});

test("can be ordered", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    workflowCommandFn: annotationBringToFront,
  });

  const annotation = await getAnnotation(page, "root_0");
  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x + 300, annotation.center.y + 100);
  await page.mouse.up();

  const kanvasBox = await getKanvasBoundingBox(page);

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });

  // bring to front
  await page.keyboard.press("ControlOrMeta+Shift+PageUp");

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});

test("have context menu", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.click(...getCenter(annotation), {
    button: "right",
  });

  const kanvasBox = await getKanvasBoundingBox(page);
  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
    maxDiffPixels,
  });
});
