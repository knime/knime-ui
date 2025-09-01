/* eslint-disable max-lines */
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";

import { MenuItems } from "@knime/components";
import { sleep } from "@knime/utils";

import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodePort,
  NodeState,
  PortType,
  TemplateLink,
} from "@/api/gateway-api/generated-api";
import type { AllowedWorkflowActions } from "@/api/gateway-api/generated-api";
import { createShortcutsService } from "@/plugins/shortcuts";
import type { ShortcutName, ShortcutsService } from "@/shortcuts";
import {
  createAvailablePortTypes,
  createComponentNode,
  createComponentPlaceholder,
  createMetanode,
  createMetanodePort,
  createNativeNode,
  createPort,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ContextMenu from "../ContextMenu.vue";

let $shortcuts: ShortcutsService;

vi.mock("@/plugins/shortcuts", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useShortcuts: () => $shortcuts,
  };
});

describe("ContextMenu.vue", () => {
  const createStores = (
    options: {
      allowedWorkflowActions?: Partial<AllowedWorkflowActions>;
      nodes?: Record<string, KnimeNode>;
    } = {},
  ) => {
    const mockedStores = mockStores();

    mockedStores.applicationSettingsStore.hasClipboardSupport = true;
    mockedStores.applicationStore.availablePortTypes = createAvailablePortTypes(
      {
        "org.some.otherPorType": {
          kind: PortType.KindEnum.Other,
          color: "blue",
          name: "Some other port",
        },
      },
    );

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        allowedActions: { canReset: true, ...options.allowedWorkflowActions },
        nodes: options.nodes,
        workflowAnnotations: [
          createWorkflowAnnotation({
            id: "annotation:1",
            text: { value: "Annotation text" },
          }),
          createWorkflowAnnotation({
            id: "annotation:2",
            text: { value: "Annotation text 2" },
          }),
        ],
        componentPlaceholders: [createComponentPlaceholder()],
      }),
    );

    const nodeOutputEl = document.createElement("div");
    nodeOutputEl.id = "node-output";
    document.body.appendChild(nodeOutputEl);

    return { mockedStores };
  };

  type MountOpts = {
    props?: Partial<InstanceType<typeof ContextMenu>["$props"]>;
    customStores?: ReturnType<typeof mockStores> | null;
  };

  const doMount = async ({
    props = {},
    customStores = null,
  }: MountOpts = {}) => {
    const defaultProps = {
      position: {
        x: 10,
        y: 10,
      },
    };

    const mockRouter = { push: () => {} };

    const { mockedStores: _mockedStores } = createStores();

    const mockedStores = customStores ?? _mockedStores;

    $shortcuts = createShortcutsService({
      // @ts-expect-error
      $router: mockRouter,
    });

    const shortcutsSpy = vi.spyOn($shortcuts, "dispatch");

    const wrapper = shallowMount(ContextMenu, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          FloatingMenu: true,
        },
        plugins: [mockedStores.testingPinia],
      },
    });

    await sleep(0);

    return { wrapper, mockedStores, shortcutsSpy };
  };

  const renderedMenuItems = (wrapper: VueWrapper<any>) =>
    wrapper.findComponent(MenuItems).props("items");

  describe("menu", () => {
    it("sets position", async () => {
      const { wrapper } = await doMount();
      expect(
        wrapper.findComponent({ name: "FloatingMenu" }).props("canvasPosition"),
      ).toStrictEqual({ x: 10, y: 10 });
      expect(
        wrapper
          .findComponent({ name: "FloatingMenu" })
          .props("preventOverflow"),
      ).toBe(true);
    });

    it("re-emits menu-close", async () => {
      const { wrapper } = await doMount();
      wrapper.findComponent({ name: "FloatingMenu" }).vm.$emit("menu-close");
      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("focuses menu items on position change", async () => {
      const { mockedStores } = createStores();

      await mockedStores.selectionStore.selectNodes(["root:1"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      const focusMock = vi.fn();

      wrapper.findComponent(MenuItems).vm.$el.focus = focusMock;
      await wrapper.setProps({ position: { x: 2, y: 3 } });
      await new Promise((r) => setTimeout(r, 0));

      expect(focusMock).toHaveBeenCalled();
    });
  });

  it("sets items on mounted", async () => {
    const { wrapper } = await doMount();

    expect(renderedMenuItems(wrapper).length).toBe(5);
  });

  it("sets items on position change", async () => {
    const { wrapper, mockedStores } = await doMount();

    const totalItemsBefore = renderedMenuItems(wrapper).length;

    await mockedStores.selectionStore.selectNodes(["root:1"]);
    await flushPromises();

    await wrapper.setProps({ position: { x: 2, y: 3 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(renderedMenuItems(wrapper).length).not.toBe(totalItemsBefore);
  });

  it("items are not set reactively", async () => {
    const { wrapper, mockedStores } = await doMount();

    await mockedStores.selectionStore.selectNodes(["root:1"]);
    await flushPromises();

    expect(
      renderedMenuItems(wrapper).map((item) => item.metadata.shortcutName),
    ).toStrictEqual([
      "executeAll",
      "resetAll",
      "paste",
      "openQuickNodeInsertionMenu",
      "addWorkflowAnnotation",
    ]);
  });

  it("uses right format for MenuItems", async () => {
    const { wrapper } = await doMount();

    await nextTick();

    expect(renderedMenuItems(wrapper)).toEqual(
      expect.arrayContaining([
        {
          metadata: { shortcutName: "executeAll" },
          text: "Execute all",
          hotkeyText: "Shift F7",
          disabled: false,
        },
      ]),
    );
  });

  it("fires correct action based on store data and passes optional event detail and metadata", async () => {
    const { wrapper, shortcutsSpy } = await doMount();
    const mockEvent = { mock: true };
    wrapper.findComponent(MenuItems).vm.$emit("item-click", mockEvent, {
      metadata: { shortcutName: "executeAll" },
    });

    expect(shortcutsSpy).toHaveBeenCalledWith("executeAll", {
      event: mockEvent,
      metadata: { position: { x: 10, y: 10 } },
    });
  });

  it("closes menu after item has been clicked", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.emitted("menuClose")).toBeFalsy();
    wrapper.findComponent(MenuItems).vm.$emit("item-click", null, {
      metadata: { shortcutName: "executeAll" },
    });

    expect(wrapper.emitted("menuClose")).toBeTruthy();
  });

  describe("visibility of menu items", () => {
    const assertItems = (
      items: Array<{
        metadata?: { shortcutName: ShortcutName | Omit<string, ShortcutName> };
        text?: string;
        separator?: boolean;
        children?: Array<any>;
      }>,
    ) => items.map((item) => expect.objectContaining(item));

    it("shows correct menu items if nothing is selected", async () => {
      const { mockedStores } = createStores({
        allowedWorkflowActions: { canCancel: true },
      });

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "executeAll" } },
          { metadata: { shortcutName: "cancelAll" } },
          { metadata: { shortcutName: "resetAll" }, separator: true },
          { metadata: { shortcutName: "paste" }, separator: true },
          {
            metadata: { shortcutName: "openQuickNodeInsertionMenu" },
            separator: true,
          },
          { metadata: { shortcutName: "addWorkflowAnnotation" } },
        ]),
      );
    });

    it("shows correct menu items if one node is selected", async () => {
      const { mockedStores } = createStores();

      await mockedStores.selectionStore.selectNodes(["root:1"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          {
            metadata: {
              shortcutName: "editNodeComment",
            },
            separator: true,
          },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node has loopInfo", async () => {
      const node = createNativeNode({
        id: "root:0",
        allowedActions: { canExecute: true, canCancel: true, canReset: true },
        state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        loopInfo: {
          allowedActions: {
            canPause: true,
            canResume: true,
            canStep: true,
          },
        },
      });
      const { mockedStores } = createStores({ nodes: { "root:0": node } });

      await mockedStores.selectionStore.selectNodes(["root:0"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "executeSelected" } },
          { text: "Open output port", children: expect.anything() },
          { metadata: { shortcutName: "resumeLoopExecution" } },
          { metadata: { shortcutName: "pauseLoopExecution" } },
          { metadata: { shortcutName: "stepLoopExecution" } },
          { metadata: { shortcutName: "cancelSelected" } },
          { metadata: { shortcutName: "resetSelected" } },
          {
            metadata: { shortcutName: "editNodeComment" },
            separator: true,
          },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node can be executed and has view", async () => {
      const node = createNativeNode({
        id: "root:0",
        state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        allowedActions: { canExecute: true, canOpenView: true },
      });

      const { mockedStores } = createStores({ nodes: { "root:0": node } });

      await mockedStores.selectionStore.selectNodes(["root:0"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "executeSelected" } },
          { metadata: { shortcutName: "executeAndOpenView" } },
          {
            text: "Open output port",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeComment" } },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node can configure legacy flow variables", async () => {
      const node = createNativeNode({
        id: "root:0",
        state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        allowedActions: {
          canOpenLegacyFlowVariableDialog: true,
          canOpenView: true,
          canExecute: true,
        },
      });

      const { mockedStores } = createStores({ nodes: { "root:0": node } });

      await mockedStores.selectionStore.selectNodes(["root:0"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "configureFlowVariables" } },
          { metadata: { shortcutName: "executeSelected" } },
          { metadata: { shortcutName: "executeAndOpenView" } },
          {
            text: "Open output port",
            children: expect.anything(),
            separator: true,
          },
          {
            metadata: { shortcutName: "editNodeComment" },
            separator: true,
          },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items for multiple selected nodes", async () => {
      const node1 = createNativeNode({
        id: "root:1",
        allowedActions: {
          canExecute: true,
        },
      });
      const node2 = createNativeNode({
        id: "root:2",
        allowedActions: {
          canExecute: true,
        },
      });
      const node3 = createNativeNode({
        id: "root:3",
        allowedActions: {
          canExecute: true,
        },
      });

      const { mockedStores } = createStores({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
          [node3.id]: node3,
        },
      });

      await mockedStores.selectionStore.selectNodes([
        "root:1",
        "root:2",
        "root:3",
      ]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "executeSelected" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          {
            text: "Node connections",
            separator: true,
            children: [
              expect.objectContaining({
                metadata: {
                  shortcutName: "autoConnectNodesDefault",
                },
              }),
              expect.objectContaining({
                metadata: {
                  shortcutName: "autoConnectNodesFlowVar",
                },
              }),
              expect.objectContaining({
                metadata: {
                  shortcutName: "autoDisconnectNodesDefault",
                },
              }),
              expect.objectContaining({
                metadata: {
                  shortcutName: "autoDisconnectNodesFlowVar",
                },
              }),
            ],
          },
          { metadata: { shortcutName: "alignHorizontally" } },
          { metadata: { shortcutName: "alignVertically" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items for multiple selected connections", async () => {
      const { mockedStores } = createStores();

      const connections =
        mockedStores.workflowStore.activeWorkflow!.connections;
      Object.values(connections)
        .map(({ id }) => id)
        .forEach((id) => {
          mockedStores.selectionStore.selectConnections(id);
        });

      const { wrapper } = await doMount({ customStores: mockedStores });

      await nextTick();

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([{ metadata: { shortcutName: "deleteSelected" } }]),
      );
    });

    it("shows correct menu items for single selected connections", async () => {
      const { mockedStores } = createStores();
      const connections =
        mockedStores.workflowStore.activeWorkflow!.connections;
      mockedStores.selectionStore.selectConnections(
        Object.keys(connections).at(0)!,
      );

      const { wrapper } = await doMount({ customStores: mockedStores });

      await nextTick();

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([{ metadata: { shortcutName: "deleteSelected" } }]),
      );
    });

    it("shows options for metanodes", async () => {
      const node = createMetanode({
        id: "root:0",
        outPorts: [
          createMetanodePort({
            typeId: "org.some.otherPorType",
            nodeState: MetaNodePort.NodeStateEnum.EXECUTED,
          }),
        ],
      });

      const { mockedStores } = createStores({ nodes: { [node.id]: node } });

      await mockedStores.selectionStore.selectNodes(["root:0"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          {
            text: "Open output port",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeComment" } },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
          { text: "Metanode" },
        ]),
      );
    });

    describe("components", () => {
      it("shows options for components", async () => {
        const node = createComponentNode({
          id: "root:0",
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
          outPorts: [
            createPort({
              typeId: "org.some.otherPorType",
            }),
          ],
        });

        const { mockedStores } = createStores({ nodes: { [node.id]: node } });

        await mockedStores.selectionStore.selectNodes(["root:0"]);
        await flushPromises();

        const { wrapper } = await doMount({ customStores: mockedStores });

        expect(renderedMenuItems(wrapper)).toEqual(
          assertItems([
            { metadata: { shortcutName: "configureNode" } },
            {
              text: "Open output port",
              children: expect.anything(),
              separator: true,
            },
            {
              metadata: { shortcutName: "editNodeComment" },
              separator: true,
            },
            { metadata: { shortcutName: "cut" } },
            { metadata: { shortcutName: "copy" } },
            { metadata: { shortcutName: "deleteSelected" }, separator: true },
            { metadata: { shortcutName: "createMetanode" } },
            { metadata: { shortcutName: "createComponent" } },
            {
              text: "Component",
              children: assertItems([
                { text: "Open component" },
                { text: "Rename component" },
                { text: "Open layout editor" },
                { text: "Share" },
              ]),
            },
          ]),
        );
      });

      it("shows options for linked components", async () => {
        const node = createComponentNode({
          id: "root:0",
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
          link: {
            url: "some:uri",
            isLinkTypeChangeable: false,
            updateStatus: TemplateLink.UpdateStatusEnum.UPTODATE,
          },
          outPorts: [
            createPort({
              typeId: "org.some.otherPorType",
            }),
          ],
        });

        const { mockedStores } = createStores({ nodes: { [node.id]: node } });

        await mockedStores.selectionStore.selectNodes(["root:0"]);
        await flushPromises();

        const { wrapper } = await doMount({ customStores: mockedStores });

        expect(renderedMenuItems(wrapper)).toEqual(
          assertItems([
            { metadata: { shortcutName: "configureNode" } },
            {
              text: "Open output port",
              children: expect.anything(),
              separator: true,
            },
            {
              metadata: { shortcutName: "editNodeComment" },
              separator: true,
            },
            { metadata: { shortcutName: "cut" } },
            { metadata: { shortcutName: "copy" } },
            { metadata: { shortcutName: "deleteSelected" }, separator: true },
            { metadata: { shortcutName: "createMetanode" } },
            { metadata: { shortcutName: "createComponent" } },
            {
              text: "Component",
              children: assertItems([
                { text: "Open component" },
                { text: "Update component" },
                { text: "Disconnect link" },
              ]),
            },
          ]),
        );
      });
    });

    it("shows correct menu items if one annotation is selected", async () => {
      const { mockedStores } = createStores();

      mockedStores.selectionStore.selectAnnotations("annotation:1");

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          {
            metadata: {
              shortcutName: "editAnnotation",
            },
          },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { text: "Arrange annotations" },
        ]),
      );
    });

    it("shows correct menu items if different object types are selected", async () => {
      const { mockedStores } = createStores({
        nodes: {
          "root:1": createNativeNode({ id: "root:1" }),
          "root:2": createNativeNode({ id: "root:2" }),
        },
      });

      mockedStores.selectionStore.selectAnnotations([
        "annotation:1",
        "annotation:2",
      ]);
      await mockedStores.selectionStore.selectNodes(["root:1", "root:2"]);
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { text: "Arrange annotations" },
          { text: "Node connections", separator: true },
          { metadata: { shortcutName: "alignHorizontally" } },
          { metadata: { shortcutName: "alignVertically" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if component placeholder is selected", async () => {
      const { mockedStores } = createStores();

      await mockedStores.selectionStore.selectComponentPlaceholder(
        "placeholder:1",
      );
      await flushPromises();

      const { wrapper } = await doMount({ customStores: mockedStores });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "cancelComponentPlaceholderLoading" } },
          { metadata: { shortcutName: "deleteComponentPlaceholder" } },
        ]),
      );
    });
  });
});
