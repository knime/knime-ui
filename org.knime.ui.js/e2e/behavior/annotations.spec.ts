/* eslint-disable no-magic-numbers */
import test, { Page, expect } from "@playwright/test";

import {
  assertSnapshot,
  getAnnotation,
  getCenter,
  pointToArray,
  startApplication,
} from "../utils";

import { annotationBringToFront } from "./workflowCommandMocks/annotation-bring-to-front";

const maxDiffPixels = 350;

test("renders correctly", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-characters.json",
  });

  await assertSnapshot(page, maxDiffPixels);
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

    await assertSnapshot(page, maxDiffPixels);

    await startAnnotationEdit(page);
    await expect(
      page.getByTestId("rich-text-annotation-toolbar"),
    ).toBeVisible();

    await assertSnapshot(page, maxDiffPixels);

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

    await assertSnapshot(page, maxDiffPixels);

    await startAnnotationEdit(page);

    // select all text
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("This is the new content");
    await page.waitForTimeout(200);
    await expect(page.getByRole("paragraph")).toContainText(
      "This is the new content",
    );
    await assertSnapshot(page, maxDiffPixels);

    // esc aborts edit
    await page.keyboard.press("Escape");
    await assertSnapshot(page, maxDiffPixels);
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

  await assertSnapshot(page, maxDiffPixels);

  await page.mouse.move(southEastTransform.x, southEastTransform.y);
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(southEastTransform.x - 200, southEastTransform.y - 200);
  await page.mouse.up({ button: "left" });

  await assertSnapshot(page, maxDiffPixels);
});

test("can be dragged", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.click(...getCenter(annotation));
  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x - 300, annotation.center.y - 100);
  await page.mouse.up();

  await assertSnapshot(page, maxDiffPixels);
});

test("ignores interaction and does rectangle selection when not selected", async ({
  page,
}) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x + 300, annotation.center.y + 100);

  await assertSnapshot(page, maxDiffPixels);
});

test("is selected by rectangle selection when fully covered", async ({
  page,
}) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.move(
    ...pointToArray({ x: annotation.x - 20, y: annotation.y - 20 }),
  );
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x, annotation.center.y);

  await assertSnapshot(page, maxDiffPixels);

  await page.mouse.move(
    annotation.x + annotation.width + 20,
    annotation.y + annotation.height + 20,
  );

  await assertSnapshot(page, maxDiffPixels);
});

test("can be ordered", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    workflowCommandFn: annotationBringToFront,
  });

  const annotation = await getAnnotation(page, "root_0");
  await page.mouse.click(...getCenter(annotation));
  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x + 300, annotation.center.y + 100);
  await page.mouse.up();

  await assertSnapshot(page, maxDiffPixels);

  // bring to front
  await page.keyboard.press("ControlOrMeta+Shift+PageUp");

  await assertSnapshot(page, maxDiffPixels);
});

test("have context menu", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.click(...getCenter(annotation), {
    button: "right",
  });

  await assertSnapshot(page, maxDiffPixels);
});
