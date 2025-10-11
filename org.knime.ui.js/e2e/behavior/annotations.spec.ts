/* eslint-disable no-magic-numbers */
import test, { Page, expect } from "@playwright/test";

import {
  assertSnapshot,
  executeUndo,
  getAnnotation,
  getCenter,
  startApplication,
} from "../utils";

import { annotationBringToFront } from "./workflowCommandMocks/annotation-bring-to-front";
import { annotationTransform } from "./workflowCommandMocks/annotation-transform";
import { undoAnnotationTransform } from "./workflowUndoCommandMock/undo-annotation-transform";

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
    await expect(
      page.getByTestId("workflow-annotation-root_0").getByRole("paragraph"),
    ).toContainText("This is the new content");
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
    await expect(
      page.getByTestId("workflow-annotation-root_0").getByRole("paragraph"),
    ).toContainText("This is the new content");
    await assertSnapshot(page, maxDiffPixels);

    // esc aborts edit
    await page.keyboard.press("Escape");
    await assertSnapshot(page, maxDiffPixels);
  });
});

test("can be transformed + undo", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    workflowCommandFn: annotationTransform,
    workflowUndoCommand: {
      fn: undoAnnotationTransform,
      data: {},
    },
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

  await executeUndo(page);

  await assertSnapshot(page, maxDiffPixels);
});

test("can be transformed via keyboard", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");

  await page.mouse.click(...getCenter(annotation));

  await assertSnapshot(page, maxDiffPixels);

  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.press("Alt+ArrowUp");
  await page.keyboard.press("Alt+ArrowUp");

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

test("panning with right click doesn't open ctx menu", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const { x, y } = await getAnnotation(page, "root_0");

  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 300, y - 300);
  await page.mouse.up();
  await assertSnapshot(page);
});

test("ignores interaction and does rectangle selection when not selected", async ({
  page,
}) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation = await getAnnotation(page, "root_0");
  // select it -> unselect it: make sure it works even when the annotation
  // had been selected before
  await page.mouse.click(...getCenter(annotation));
  await page.mouse.click(annotation.x - 20, annotation.y - 20);

  await page.mouse.move(...getCenter(annotation));
  await page.mouse.down({ button: "left", clickCount: 1 });
  await page.mouse.move(annotation.center.x + 300, annotation.center.y + 100);

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

test("context menu retains multi-selection", async ({ page }) => {
  await startApplication(page, {
    workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
  });

  const annotation1 = await getAnnotation(page, "root_0");
  const annotation2 = await getAnnotation(page, "root_1");

  await page.mouse.click(...getCenter(annotation1));
  await page.keyboard.down("Shift");
  await page.mouse.click(...getCenter(annotation2));
  await page.keyboard.up("Shift");

  await page.mouse.click(...getCenter(annotation1), { button: "right" });

  await assertSnapshot(page, maxDiffPixels);
});

[{ key: "ContextMenu" }, { key: "Shift+F10" }].forEach(({ key }) => {
  test(`context menu opens with keyboard via: ${key}`, async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "annotation/getWorkflow-annotation-editing.json",
    });

    const annotation = await getAnnotation(page, "root_0");

    await page.mouse.click(...getCenter(annotation));

    await page.keyboard.press(key);
    await assertSnapshot(page, maxDiffPixels);
  });
});
