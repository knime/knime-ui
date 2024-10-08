/* eslint-disable max-lines */
import { expect, describe, it, vi, afterEach } from "vitest";
import { h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import type { Store } from "vuex";

import { mockVuexStore } from "@/test/utils";
import { createWorkflow, createWorkflowAnnotation } from "@/test/factories";
import { mockUserAgent } from "jest-useragent-mock";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { API } from "@api";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import * as applicationStore from "@/store/application";
import * as canvasStore from "@/store/canvas";
import * as uiControlsStore from "@/store/uiControls";
import {
  type WorkflowAnnotation,
  type Bounds,
  TypedText,
} from "@/api/gateway-api/generated-api";

import { RichTextEditor } from "@knime/rich-text-editor";
import WorkflowAnnotationComp from "../WorkflowAnnotation.vue";
import RichTextAnnotation from "../RichTextAnnotation.vue";
import LegacyAnnotation from "../LegacyAnnotation.vue";
import TransformControls from "../TransformControls.vue";

describe("WorkflowAnnotation.vue", () => {
  const defaultProps = {
    annotation: createWorkflowAnnotation({
      id: "id1",
      text: { value: "hallo" },
    }),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    props = {},
    transformControlStub = null,
    directives = {},
  } = {}) => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      canvas: canvasStore,
      selection: selectionStore,
      application: {
        ...applicationStore,
        actions: {
          toggleContextMenu: vi.fn(),
        },
      },
      uiControls: uiControlsStore,
    });

    const div = document.createElement("div");
    $store.commit("canvas/setScrollContainerElement", div);

    $store.commit(
      "workflow/setActiveWorkflow",
      createWorkflow({
        workflowAnnotations: [defaultProps.annotation],
      }),
    );

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(WorkflowAnnotationComp, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
        plugins: [$store],
        stubs: {
          RichTextEditor: true,
          TransformControls: transformControlStub ?? false,
        },
        directives,
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  it("should render LegacyAnnotation", () => {
    const { wrapper } = doMount({
      props: {
        annotation: { ...defaultProps.annotation, id: "id2" },
      },
    });

    expect(wrapper.findComponent(LegacyAnnotation).props("annotation")).toEqual(
      {
        ...defaultProps.annotation,
        id: "id2",
      },
    );
    expect(wrapper.findComponent(RichTextEditor).exists()).toBe(false);
  });

  it("should render RichTextAnnotation", async () => {
    const { wrapper } = doMount({
      props: {
        annotation: {
          ...defaultProps.annotation,
          text: {
            value: defaultProps.annotation.text.value,
            contentType: TypedText.ContentTypeEnum.Html,
          },
        },
      },
    });

    await nextTick();

    expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
    expect(wrapper.findComponent(RichTextAnnotation).props("id")).toEqual(
      defaultProps.annotation.id,
    );
    expect(
      wrapper.findComponent(RichTextAnnotation).props("initialValue"),
    ).toEqual(defaultProps.annotation.text.value);
  });

  describe("transform", () => {
    const getTransformControlsStub = (transformedBounds: Bounds) => ({
      render(): any {
        return h(
          "g",
          // @ts-ignore
          this.$slots.default({
            transformedBounds,
          }),
        );
      },
    });

    it("should trigger call to transform annotation", () => {
      const { wrapper, $store } = doMount();
      const bounds = { x: 15, y: 15, width: 100, height: 100 };

      wrapper
        .findComponent(TransformControls)
        .vm.$emit("transformEnd", { bounds });
      const projectId = $store.state.workflow.activeWorkflow.projectId;
      const workflowId = $store.state.workflow.activeWorkflow.info.containerId;

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds,
        annotationId: defaultProps.annotation.id,
      });
    });

    it("should transform annotation using keyboard shortcuts", async () => {
      const { $store } = doMount();

      const dispatchKeyEvent = (key: string, altKey: boolean) => {
        const event = new KeyboardEvent("keydown", {
          altKey,
          key,
        });

        window.dispatchEvent(event);
      };

      dispatchKeyEvent("ArrowUp", false);

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).not.toHaveBeenCalled();

      const projectId = $store.state.workflow.activeWorkflow.projectId;
      const workflowId = $store.state.workflow.activeWorkflow.info.containerId;

      await $store.dispatch(
        "selection/selectAnnotation",
        defaultProps.annotation.id,
      );

      const { bounds: currentBounds } = defaultProps.annotation;

      dispatchKeyEvent("ArrowUp", true);

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds: expect.objectContaining({ height: currentBounds.height - 10 }),
        annotationId: defaultProps.annotation.id,
      });

      dispatchKeyEvent("ArrowDown", true);

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds: expect.objectContaining({ height: currentBounds.height + 10 }),
        annotationId: defaultProps.annotation.id,
      });

      dispatchKeyEvent("ArrowLeft", true);

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds: expect.objectContaining({ width: currentBounds.width - 10 }),
        annotationId: defaultProps.annotation.id,
      });

      dispatchKeyEvent("ArrowRight", true);

      expect(
        API.workflowCommand.TransformWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds: expect.objectContaining({ width: currentBounds.width + 10 }),
        annotationId: defaultProps.annotation.id,
      });
    });

    it("should set the transformed annotation bounds", () => {
      const bounds = { x: 15, y: 15, width: 100, height: 100 };
      const transformControlStub = getTransformControlsStub(bounds);
      const selector = '[data-test-id="transformed-controls"]';
      // @ts-ignore
      const { wrapper } = doMount({ transformControlStub });

      expect(wrapper.find(selector).attributes("x")).toEqual(
        bounds.x.toString(),
      );
      expect(wrapper.find(selector).attributes("y")).toEqual(
        bounds.y.toString(),
      );
      expect(wrapper.find(selector).attributes("width")).toEqual(
        bounds.width.toString(),
      );
      expect(wrapper.find(selector).attributes("height")).toEqual(
        bounds.height.toString(),
      );
    });
  });

  describe("edit", () => {
    const modernAnnotation: WorkflowAnnotation = {
      ...defaultProps.annotation,
      text: {
        value: defaultProps.annotation.text.value,
        contentType: TypedText.ContentTypeEnum.Html,
      },
    };

    const toggleAnnotationEdit = ($store: Store<any>, annotationId: string) => {
      $store.commit("workflow/setEditableAnnotationId", annotationId);
      return nextTick();
    };

    it("should start editing when dblclicking on LegacyAnnotation", () => {
      const { wrapper, $store } = doMount();

      wrapper.findComponent(LegacyAnnotation).trigger("dblclick");
      expect($store.state.workflow.editableAnnotationId).toBe(
        defaultProps.annotation.id,
      );
    });

    it("should start editing when dblclicking on RichTextAnnotation", () => {
      const { wrapper, $store } = doMount({
        props: { annotation: modernAnnotation },
      });

      wrapper.findComponent(RichTextAnnotation).vm.$emit("editStart");
      expect($store.state.workflow.editableAnnotationId).toBe(
        modernAnnotation.id,
      );
    });

    it("should not allow editing when for non-writable workflows", () => {
      const { wrapper, $store } = doMount({
        props: { annotation: modernAnnotation },
      });
      $store.state.workflow.activeWorkflow.info.linked = true;

      expect($store.state.workflow.editableAnnotationId).toBeNull();
      wrapper.findComponent(RichTextAnnotation).vm.$emit("editStart");
      expect(wrapper.findComponent(RichTextEditor).props("editable")).toBe(
        false,
      );
      expect($store.state.workflow.editableAnnotationId).toBeNull();
    });

    it("should render RichTextEditor when annotation is editable", async () => {
      const { wrapper, $store } = doMount();

      await toggleAnnotationEdit($store, defaultProps.annotation.id);

      expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
      expect(wrapper.findComponent(RichTextEditor).exists()).toBe(true);
      expect(wrapper.findComponent(RichTextEditor).props("editable")).toBe(
        true,
      );
    });

    it("should set the active border color when first editing legacy annotations", async () => {
      const annotation: WorkflowAnnotation = {
        ...defaultProps.annotation,
        text: {
          value: "some text \r\n some more text",
          contentType: TypedText.ContentTypeEnum.Plain,
        },
      };

      const { wrapper, $store, dispatchSpy } = doMount({
        props: { annotation },
      });

      await toggleAnnotationEdit($store, "id1");
      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe($colors.defaultAnnotationBorderColor);

      const newText = "<p>new content</p>";
      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialValue"),
      ).toBe("some text <br /> some more text");

      wrapper.findComponent(RichTextAnnotation).vm.$emit("change", newText);

      // emulate click outside
      window.dispatchEvent(new Event("click"));

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: defaultProps.annotation.id,
        text: newText,
        borderColor: $colors.defaultAnnotationBorderColor,
      });
    });

    it("should set the active border color for new annotations", async () => {
      const { wrapper, $store } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit($store, defaultProps.annotation.id);
      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#000000");
    });

    it("should update the active border color for new annotations when it changes in the state", async () => {
      const { wrapper, $store } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit($store, defaultProps.annotation.id);
      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#000000");

      await wrapper.setProps({
        annotation: { ...modernAnnotation, borderColor: "#987654" },
      });

      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#987654");
    });

    it("should dispatch an update of an annotation content (no color change)", async () => {
      const { wrapper, $store, dispatchSpy } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit($store, modernAnnotation.id);
      const newContent = "<p>new content</p>";

      wrapper.findComponent(RichTextAnnotation).vm.$emit("change", newContent);
      await nextTick();

      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialValue"),
      ).toBe(modernAnnotation.text.value);

      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#000000");

      // emulate click outside
      window.dispatchEvent(new Event("click"));

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: defaultProps.annotation.id,
        text: newContent,
        borderColor: "#000000",
      });
    });

    it("should dispatch an update of an annotation border color (no content change)", async () => {
      const { wrapper, $store, dispatchSpy } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit($store, modernAnnotation.id);
      const newColor = "#123456";

      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialValue"),
      ).toBe(modernAnnotation.text.value);

      wrapper
        .findComponent(RichTextAnnotation)
        .vm.$emit("changeBorderColor", newColor);
      await nextTick();

      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#000000");

      // emulate click outside
      window.dispatchEvent(new Event("click"));

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: defaultProps.annotation.id,
        text: modernAnnotation.text.value,
        borderColor: newColor,
      });
    });

    it("should save content on  blur event", async () => {
      const { wrapper, $store, dispatchSpy } = doMount({
        props: { annotation: modernAnnotation },
      });

      await toggleAnnotationEdit($store, modernAnnotation.id);
      const newText = "some newer text";
      wrapper.findComponent(RichTextAnnotation).vm.$emit("change", newText);
      wrapper.findComponent(RichTextAnnotation).vm.$emit("blur", newText);

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: defaultProps.annotation.id,
        text: newText,
        borderColor: modernAnnotation.borderColor,
      });
    });
  });

  describe("selection", () => {
    it("should select with left click", async () => {
      const { wrapper, $store } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0 });
      await nextTick();

      expect($store.state.selection.selectedNodes).toEqual({});
      expect($store.state.selection.selectedConnections).toEqual({});
      expect($store.state.selection.selectedAnnotations).toEqual({ id1: true });
    });

    it.each(["shift", "ctrl"])(
      "%ss-click toggles the selection of annotation",
      async (mod) => {
        mockUserAgent("windows");
        const { wrapper, dispatchSpy } = doMount();

        await wrapper
          .findComponent(TransformControls)
          .trigger("click", { button: 0, [`${mod}Key`]: true });

        // selects annotation
        expect(dispatchSpy).toHaveBeenCalledWith(
          "selection/toggleAnnotationSelection",
          {
            annotationId: defaultProps.annotation.id,
            isMultiselect: true,
            isSelected: false,
          },
        );

        await wrapper
          .findComponent(TransformControls)
          .trigger("click", { button: 0, [`${mod}Key`]: true });

        // deselects annotation
        expect(dispatchSpy).toHaveBeenCalledWith(
          "selection/toggleAnnotationSelection",
          {
            annotationId: defaultProps.annotation.id,
            isMultiselect: true,
            isSelected: true,
          },
        );
      },
    );

    it("should toggle the selection of annotation with meta + left click", async () => {
      mockUserAgent("mac");
      const { wrapper, dispatchSpy } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/toggleAnnotationSelection",
        {
          annotationId: defaultProps.annotation.id,
          isMultiselect: true,
          isSelected: false,
        },
      );

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/toggleAnnotationSelection",
        {
          annotationId: defaultProps.annotation.id,
          isMultiselect: true,
          isSelected: true,
        },
      );
    });
  });

  describe("context menu", () => {
    it("click to select clicked annotation and deselect other items", async () => {
      const { wrapper, dispatchSpy } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2 });

      expect(dispatchSpy).toHaveBeenCalledWith("selection/deselectAllObjects");
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        defaultProps.annotation.id,
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
    });

    it("left click with control on Mac opens context menu", async () => {
      mockUserAgent("mac");
      const { wrapper, dispatchSpy } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 0, ctrlKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith("selection/deselectAllObjects");
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        defaultProps.annotation.id,
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
    });

    it.each(["shift", "ctrl"])("%ss-click adds to selection", async (mod) => {
      mockUserAgent("windows");
      const { wrapper, dispatchSpy } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2, [`${mod}Key`]: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        defaultProps.annotation.id,
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
    });

    it("meta click adds to selection", async () => {
      mockUserAgent("mac");
      const { wrapper, dispatchSpy } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2, metaKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        defaultProps.annotation.id,
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
    });
  });
});
