import { expect, describe, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import type { Store } from "vuex";
import { mixin as VueClickAway } from "vue3-click-away";

import { mockVuexStore } from "@/test/utils";
import { mockUserAgent } from "jest-useragent-mock";

import * as $colors from "@/style/colors.mjs";
import * as $shapes from "@/style/shapes.mjs";
import { API } from "@api";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import * as canvasStore from "@/store/canvas";
import {
  type WorkflowAnnotation,
  Annotation,
  type Bounds,
} from "@/api/gateway-api/generated-api";

import WorkflowAnnotationComp from "../WorkflowAnnotation.vue";
import LegacyAnnotation from "../LegacyAnnotation.vue";
import RichTextEditor from "../RichTextEditor.vue";
import TransformControls from "../TransformControls.vue";

vi.mock("vue3-click-away", () => {
  const createMockClickAwayDirective = () => {
    let callback = () => {};

    return {
      mounted(el, bindings) {
        callback = bindings.value;
      },
      trigger() {
        callback();
      },
    };
  };

  const mockClickAwayDirective = createMockClickAwayDirective();

  return {
    mixin: {
      trigger: mockClickAwayDirective.trigger,
      directives: {
        ClickAway: mockClickAwayDirective,
      },
    },
  };
});

describe("Workflow Annotation", () => {
  const defaultProps: {
    annotation: WorkflowAnnotation;
  } = {
    annotation: {
      id: "id1",
      textAlign: Annotation.TextAlignEnum.Right,
      borderWidth: 4,
      borderColor: "#000",
      backgroundColor: "#000",
      bounds: { x: 0, y: 0, width: 100, height: 50 },
      text: "hallo",
      styleRanges: [{ start: 0, length: 2, fontSize: 14 }],
      contentType: Annotation.ContentTypeEnum.Plain,
    },
  };

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
        actions: {
          toggleContextMenu: vi.fn(),
        },
      },
    });

    $store.commit("workflow/setActiveWorkflow", {
      projectId: "project1",
      info: { containerId: "root" },
      nodes: { "root:1": { id: "root:1" } },
      connections: {},
      workflowAnnotations: [defaultProps.annotation],
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(WorkflowAnnotationComp, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
        plugins: [$store],
        stubs: {
          RichTextEditor: true,
          TransformControls: transformControlStub || false,
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
      }
    );
    expect(wrapper.findComponent(RichTextEditor).exists()).toBe(false);
  });

  it("should render RichTextEditor", async () => {
    const { wrapper } = doMount({
      props: {
        annotation: {
          ...defaultProps.annotation,
          contentType: Annotation.ContentTypeEnum.Html,
        },
      },
    });

    await nextTick();

    expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
    expect(wrapper.findComponent(RichTextEditor).props("id")).toEqual(
      defaultProps.annotation.id
    );
    expect(wrapper.findComponent(RichTextEditor).props("initialValue")).toEqual(
      defaultProps.annotation.text
    );
  });

  describe("transform", () => {
    const getTransformControlsStub = (transformedBounds: Bounds) => ({
      render() {
        // @ts-ignore
        return h(
          "g",
          this.$slots.default({
            transformedBounds,
          })
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
        API.workflowCommand.TransformWorkflowAnnotation
      ).toHaveBeenCalledWith({
        projectId,
        workflowId,
        bounds,
        annotationId: defaultProps.annotation.id,
      });
    });

    it("should set the transformed annotation bounds", () => {
      const bounds = { x: 15, y: 15, width: 100, height: 100 };
      const transformControlStub = getTransformControlsStub(bounds);
      const { wrapper } = doMount({ transformControlStub });

      expect(wrapper.find("foreignObject").attributes("x")).toEqual(
        bounds.x.toString()
      );
      expect(wrapper.find("foreignObject").attributes("y")).toEqual(
        bounds.y.toString()
      );
      expect(wrapper.find("foreignObject").attributes("width")).toEqual(
        bounds.width.toString()
      );
      expect(wrapper.find("foreignObject").attributes("height")).toEqual(
        bounds.height.toString()
      );
    });
  });

  describe("edit", () => {
    const modernAnnotation = {
      ...defaultProps.annotation,
      contentType: Annotation.ContentTypeEnum.Html,
    };

    const toggleAnnotationEdit = ($store: Store<any>, annotationId: string) => {
      $store.commit("workflow/setEditableAnnotationId", annotationId);
      return nextTick();
    };

    it("should start editing when dblclicking on LegacyAnnotation", () => {
      const { wrapper, $store } = doMount();

      wrapper.findComponent(LegacyAnnotation).trigger("dblclick");
      expect($store.state.workflow.editableAnnotationId).toBe(
        defaultProps.annotation.id
      );
    });

    it("should start editing when dblclicking on RichTextEditor", () => {
      const { wrapper, $store } = doMount({
        props: { annotation: modernAnnotation },
      });

      wrapper.findComponent(RichTextEditor).vm.$emit("editStart");
      expect($store.state.workflow.editableAnnotationId).toBe(
        modernAnnotation.id
      );
    });

    it("should render RichTextEditor when annotation is editable", async () => {
      const { wrapper, $store } = doMount();

      await toggleAnnotationEdit($store, "id1");

      expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
      expect(wrapper.findComponent(RichTextEditor).exists()).toBe(true);
      expect(wrapper.findComponent(RichTextEditor).props("editable")).toBe(
        true
      );
    });

    it("should set the active border color when first editing legacy annotations", async () => {
      const { wrapper, $store, dispatchSpy } = doMount({
        props: {
          annotation: {
            ...defaultProps.annotation,
            text: "some text \r\n some more text",
          },
        },
      });

      await toggleAnnotationEdit($store, "id1");
      expect(wrapper.findComponent(RichTextEditor).props("borderColor")).toBe(
        $colors.defaultAnnotationBorderColor
      );

      const newText = "<p>new content</p>";
      expect(wrapper.findComponent(RichTextEditor).props("initialValue")).toBe(
        "some text <br /> some more text"
      );
      wrapper.findComponent(RichTextEditor).vm.$emit("change", newText);
      // @ts-ignore
      VueClickAway.trigger();

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: "id1",
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

      await toggleAnnotationEdit($store, "id1");
      expect(wrapper.findComponent(RichTextEditor).props("borderColor")).toBe(
        "#000000"
      );
    });

    it("should dispatch an update of an annotation content (no color change)", async () => {
      const { wrapper, $store, dispatchSpy } = doMount({
        props: {
          annotation: { ...modernAnnotation, borderColor: "#000000" },
        },
      });

      await toggleAnnotationEdit($store, modernAnnotation.id);
      const newContent = "<p>new content</p>";

      wrapper.findComponent(RichTextEditor).vm.$emit("change", newContent);
      await nextTick();

      expect(wrapper.findComponent(RichTextEditor).props("initialValue")).toBe(
        modernAnnotation.text
      );
      expect(wrapper.findComponent(RichTextEditor).props("borderColor")).toBe(
        "#000000"
      );
      // @ts-ignore
      VueClickAway.trigger();

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: "id1",
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

      expect(wrapper.findComponent(RichTextEditor).props("initialValue")).toBe(
        modernAnnotation.text
      );
      wrapper
        .findComponent(RichTextEditor)
        .vm.$emit("changeBorderColor", newColor);
      await nextTick();

      expect(wrapper.findComponent(RichTextEditor).props("borderColor")).toBe(
        newColor
      );
      // @ts-ignore
      VueClickAway.trigger();

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateAnnotation", {
        annotationId: "id1",
        text: modernAnnotation.text,
        borderColor: newColor,
      });
    });
  });

  describe("selection", () => {
    it("should select with left click", async () => {
      const { wrapper, $store } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0 });
      await wrapper.vm.$nextTick();

      expect($store.state.selection.selectedNodes).toEqual({});
      expect($store.state.selection.selectedConnections).toEqual({});
      expect($store.state.selection.selectedAnnotations).toEqual({ id1: true });
    });

    it.each(["shift", "ctrl"])("%ss-click adds to selection", async (mod) => {
      mockUserAgent("windows");
      const { wrapper, dispatchSpy } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, [`${mod}Key`]: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        "id1"
      );
    });

    it("should add to selection with meta + left click", async () => {
      mockUserAgent("mac");
      const { wrapper, dispatchSpy } = doMount();

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        "id1"
      );
    });

    it.each(["shift", "ctrl"])(
      "%ss-click removes from selection",
      async (mod) => {
        mockUserAgent("windows");
        const { wrapper, $store } = doMount();
        await $store.dispatch("selection/selectAnnotation", "id1");

        await wrapper
          .findComponent(TransformControls)
          .trigger("click", { button: 0, [`${mod}Key`]: true });

        expect($store.state.selection.selectedAnnotations).toEqual({});
      }
    );

    it("should remove from selection with meta + left click", async () => {
      mockUserAgent("mac");
      const { wrapper, $store } = doMount();
      await $store.dispatch("selection/selectAnnotation", "id1");

      await wrapper
        .findComponent(TransformControls)
        .trigger("click", { button: 0, metaKey: true });
      expect($store.state.selection.selectedAnnotations).toEqual({});
    });
  });

  describe("context menu", () => {
    it("click to select clicked annotation and deselect other items", async () => {
      const { wrapper, dispatchSpy } = doMount();
      await wrapper
        .findComponent(TransformControls)
        .trigger("pointerdown", { button: 2 });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        undefined
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectAnnotation",
        "id1"
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything()
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
        "id1"
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything()
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
        "id1"
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything()
      );
    });
  });
});
