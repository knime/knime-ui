/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { API } from "@api";
import { mockUserAgent } from "jest-useragent-mock";

import { RichTextEditor } from "@knime/rich-text-editor";

import {
  type Bounds,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { createWorkflow, createWorkflowAnnotation } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import LegacyAnnotation from "../LegacyAnnotation.vue";
import RichTextAnnotation from "../RichTextAnnotation.vue";
import TransformControls from "../TransformControls.vue";
import WorkflowAnnotationComp from "../WorkflowAnnotation.vue";

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
    const mockedStores = mockStores();

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        workflowAnnotations: [defaultProps.annotation],
      }),
    );

    const wrapper = mount(WorkflowAnnotationComp, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
        plugins: [mockedStores.testingPinia],
        stubs: {
          RichTextEditor: true,
          TransformControls: transformControlStub ?? false,
        },
        directives,
      },
    });

    return { wrapper, mockedStores };
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
      const { wrapper, mockedStores } = doMount();
      const bounds = { x: 15, y: 15, width: 100, height: 100 };

      wrapper
        .findComponent(TransformControls)
        .vm.$emit("transformEnd", { bounds });
      const projectId = mockedStores.workflowStore.activeWorkflow!.projectId;
      const workflowId =
        mockedStores.workflowStore.activeWorkflow!.info.containerId;

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
      const { mockedStores } = doMount();

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

      const projectId = mockedStores.workflowStore.activeWorkflow!.projectId;
      const workflowId =
        mockedStores.workflowStore.activeWorkflow!.info.containerId;

      await mockedStores.selectionStore.selectAnnotation(
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

    const toggleAnnotationEdit = (
      mockedStores: ReturnType<typeof mockStores>,
      annotationId: string,
    ) => {
      mockedStores.annotationInteractionsStore.setEditableAnnotationId(
        annotationId,
      );
      return nextTick();
    };

    it("should start editing when dblclicking on LegacyAnnotation", () => {
      const { wrapper, mockedStores } = doMount();

      wrapper.findComponent(LegacyAnnotation).trigger("dblclick");
      expect(
        mockedStores.annotationInteractionsStore.editableAnnotationId,
      ).toBe(defaultProps.annotation.id);
    });

    it("should start editing when dblclicking on RichTextAnnotation", () => {
      const { wrapper, mockedStores } = doMount({
        props: { annotation: modernAnnotation },
      });

      wrapper.findComponent(RichTextAnnotation).vm.$emit("editStart");
      expect(
        mockedStores.annotationInteractionsStore.editableAnnotationId,
      ).toBe(modernAnnotation.id);
    });

    it("should not allow editing when for non-writable workflows", () => {
      const { wrapper, mockedStores } = doMount({
        props: { annotation: modernAnnotation },
      });
      mockedStores.workflowStore.activeWorkflow!.info.linked = true;

      expect(
        mockedStores.annotationInteractionsStore.editableAnnotationId,
      ).toBeNull();
      wrapper.findComponent(RichTextAnnotation).vm.$emit("editStart");
      expect(wrapper.findComponent(RichTextEditor).props("editable")).toBe(
        false,
      );
      expect(
        mockedStores.annotationInteractionsStore.editableAnnotationId,
      ).toBeNull();
    });

    it("should render RichTextEditor when annotation is editable", async () => {
      const { wrapper, mockedStores } = doMount();

      await toggleAnnotationEdit(mockedStores, defaultProps.annotation.id);

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

      const { wrapper, mockedStores } = doMount({
        props: { annotation },
      });

      await toggleAnnotationEdit(mockedStores, "id1");
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

      expect(
        mockedStores.annotationInteractionsStore.updateAnnotation,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        text: newText,
        borderColor: $colors.defaultAnnotationBorderColor,
      });
    });

    it("should set the active border color for new annotations", async () => {
      const { wrapper, mockedStores } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit(mockedStores, defaultProps.annotation.id);
      expect(
        wrapper.findComponent(RichTextAnnotation).props("initialBorderColor"),
      ).toBe("#000000");
    });

    it("should update the active border color for new annotations when it changes in the state", async () => {
      const { wrapper, mockedStores } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit(mockedStores, defaultProps.annotation.id);
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
      const { wrapper, mockedStores } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit(mockedStores, modernAnnotation.id);
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

      expect(
        mockedStores.annotationInteractionsStore.updateAnnotation,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        text: newContent,
        borderColor: "#000000",
      });
    });

    it("should dispatch an update of an annotation border color (no content change)", async () => {
      const { wrapper, mockedStores } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit(mockedStores, modernAnnotation.id);
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
      ).toBe("#123456");

      // emulate click outside
      window.dispatchEvent(new Event("click"));

      expect(
        mockedStores.annotationInteractionsStore.updateAnnotation,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        text: modernAnnotation.text.value,
        borderColor: newColor,
      });
    });

    it("should save content on  blur event", async () => {
      const { wrapper, mockedStores } = doMount({
        props: { annotation: modernAnnotation },
      });

      await toggleAnnotationEdit(mockedStores, modernAnnotation.id);
      const newText = "some newer text";
      wrapper.findComponent(RichTextAnnotation).vm.$emit("change", newText);
      wrapper.findComponent(RichTextAnnotation).vm.$emit("blur", newText);

      expect(
        mockedStores.annotationInteractionsStore.updateAnnotation,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        text: newText,
        borderColor: modernAnnotation.borderColor,
      });
    });
  });

  describe("selection", () => {
    it("should select with left click", async () => {
      const { wrapper, mockedStores } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0 });
      await nextTick();

      expect(mockedStores.selectionStore.selectedNodes).toEqual({});
      expect(mockedStores.selectionStore.selectedConnections).toEqual({});
      expect(mockedStores.selectionStore.selectedAnnotations).toEqual({
        id1: true,
      });
    });

    it.each(["shift", "ctrl"])(
      "%ss-click toggles the selection of annotation",
      async (mod) => {
        mockUserAgent("windows");
        const { wrapper, mockedStores } = doMount();

        await wrapper
          .findComponent(TransformControls)
          .trigger("click", { button: 0, [`${mod}Key`]: true });

        // selects annotation
        expect(
          mockedStores.selectionStore.toggleAnnotationSelection,
        ).toHaveBeenCalledWith({
          annotationId: defaultProps.annotation.id,
          isMultiselect: true,
          isSelected: false,
        });

        await wrapper
          .findComponent(TransformControls)
          .trigger("click", { button: 0, [`${mod}Key`]: true });

        // deselects annotation
        expect(
          mockedStores.selectionStore.toggleAnnotationSelection,
        ).toHaveBeenCalledWith({
          annotationId: defaultProps.annotation.id,
          isMultiselect: true,
          isSelected: true,
        });
      },
    );

    it("should toggle the selection of annotation with meta + left click", async () => {
      mockUserAgent("mac");
      const { wrapper, mockedStores } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });

      expect(
        mockedStores.selectionStore.toggleAnnotationSelection,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        isMultiselect: true,
        isSelected: false,
      });

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });

      expect(
        mockedStores.selectionStore.toggleAnnotationSelection,
      ).toHaveBeenCalledWith({
        annotationId: defaultProps.annotation.id,
        isMultiselect: true,
        isSelected: true,
      });
    });
  });

  describe("context menu", () => {
    it("click to select clicked annotation and deselect other items", async () => {
      const { wrapper, mockedStores } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2 });

      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
      expect(mockedStores.selectionStore.selectAnnotation).toHaveBeenCalledWith(
        defaultProps.annotation.id,
      );
      expect(
        mockedStores.applicationStore.toggleContextMenu,
      ).toHaveBeenCalled();
    });

    it("left click with control on Mac opens context menu", async () => {
      mockUserAgent("mac");
      const { wrapper, mockedStores } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 0, ctrlKey: true });

      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
      expect(mockedStores.selectionStore.selectAnnotation).toHaveBeenCalledWith(
        defaultProps.annotation.id,
      );
      expect(
        mockedStores.applicationStore.toggleContextMenu,
      ).toHaveBeenCalled();
    });

    it.each(["shift", "ctrl"])("%ss-click adds to selection", async (mod) => {
      mockUserAgent("windows");
      const { wrapper, mockedStores } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2, [`${mod}Key`]: true });

      expect(mockedStores.selectionStore.selectAnnotation).toHaveBeenCalledWith(
        defaultProps.annotation.id,
      );
      expect(
        mockedStores.applicationStore.toggleContextMenu,
      ).toHaveBeenCalled();
    });

    it("meta click adds to selection", async () => {
      mockUserAgent("mac");
      const { wrapper, mockedStores } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2, metaKey: true });

      expect(mockedStores.selectionStore.selectAnnotation).toHaveBeenCalledWith(
        defaultProps.annotation.id,
      );
      expect(
        mockedStores.applicationStore.toggleContextMenu,
      ).toHaveBeenCalled();
    });
  });
});
