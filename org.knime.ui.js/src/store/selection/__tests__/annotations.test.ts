import { describe, expect, it } from "vitest";

import { createWorkflow, createWorkflowAnnotation } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection::annotations", () => {
  const loadStore = () => {
    const mockedStores = mockStores();
    const annotation1 = createWorkflowAnnotation({ id: "root__1" });
    const annotation2 = createWorkflowAnnotation({ id: "root__2" });
    const workflow = createWorkflow({
      workflowAnnotations: [annotation1, annotation2],
    });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    return { ...mockedStores, annotation1, annotation2 };
  };

  it("selects/deselects", () => {
    const { selectionStore, annotation1, annotation2 } = loadStore();

    expect(selectionStore.getSelectedAnnotations).toEqual([]);
    expect(selectionStore.selectedAnnotationIds).toEqual([]);
    expect(selectionStore.singleSelectedAnnotation).toBeNull();

    selectionStore.selectAnnotations([annotation1.id, annotation2.id]);
    expect(selectionStore.getSelectedAnnotations).toEqual([
      annotation1,
      annotation2,
    ]);
    expect(selectionStore.selectedAnnotationIds).toEqual([
      annotation1.id,
      annotation2.id,
    ]);
    expect(selectionStore.singleSelectedAnnotation).toBeNull();
    expect(selectionStore.isAnnotationSelected(annotation1.id)).toBe(true);
    expect(selectionStore.isAnnotationSelected(annotation2.id)).toBe(true);

    selectionStore.deselectAnnotations([annotation2.id]);
    expect(selectionStore.getSelectedAnnotations).toEqual([annotation1]);
    expect(selectionStore.selectedAnnotationIds).toEqual([annotation1.id]);
    expect(selectionStore.isAnnotationSelected(annotation2.id)).toBe(false);
    expect(selectionStore.singleSelectedAnnotation).toEqual(annotation1);
  });

  it("returns visual state", () => {
    const { selectionStore, annotation1 } = loadStore();
    const { showSelection, showFocus, showTransformControls } =
      selectionStore.getAnnotationVisualSelectionState(annotation1.id);

    expect(showSelection.value).toBe(false);
    expect(showFocus.value).toBe(false);
    expect(showTransformControls.value).toBe(false);

    selectionStore.selectAnnotations([annotation1.id]);

    expect(showSelection.value).toBe(true);
    expect(showFocus.value).toBe(false);
    expect(showTransformControls.value).toBe(true);

    selectionStore.shouldHideSelection = true;
    expect(showSelection.value).toBe(false);
    expect(showFocus.value).toBe(false);
    expect(showTransformControls.value).toBe(false);

    selectionStore.shouldHideSelection = false;
    selectionStore.focusObject({
      id: annotation1.id,
      type: "annotation",
      x: annotation1.bounds.x,
      y: annotation1.bounds.y,
    });
    expect(showSelection.value).toBe(true);
    expect(showFocus.value).toBe(true);
    expect(showTransformControls.value).toBe(true);
  });

  it("handles preview/committed state", () => {
    const { selectionStore, annotation1, annotation2 } = loadStore();
    const previewState = selectionStore.querySelection("preview");
    const committedState = selectionStore.querySelection("committed");

    selectionStore.selectAnnotations([annotation1.id], "preview");
    expect(previewState.selectedAnnotationIds.value).toEqual([annotation1.id]);
    expect(committedState.selectedAnnotationIds.value).toEqual([]);

    selectionStore.selectAnnotations([annotation2.id], "preview");
    expect(previewState.selectedAnnotationIds.value).toEqual([
      annotation1.id,
      annotation2.id,
    ]);
    expect(committedState.selectedAnnotationIds.value).toEqual([]);
    expect(previewState.hasUncommittedSelection.value).toBe(true);

    selectionStore.commitSelectionPreview();
    expect(previewState.hasUncommittedSelection.value).toBe(false);
    expect(previewState.selectedAnnotationIds.value).toEqual(
      committedState.selectedAnnotationIds.value,
    );
  });
});
