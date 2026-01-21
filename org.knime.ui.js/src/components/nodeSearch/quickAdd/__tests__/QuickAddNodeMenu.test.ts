import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { Button, NodePreview } from "@knime/components";

import {
  NativeNodeInvariants,
  type NodeTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createNodePortTemplate,
  createNodeTemplate,
  createPort,
  createSearchNodesResponse,
  createWorkflow,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import QuickAddNodeMenu from "../QuickAddNodeMenu.vue";

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useToasts: vi.fn(),
  };
});

const defaultNodeRecommendationsResponse = [
  createNodeTemplate(),
  createNodeTemplate({
    inPorts: [
      createNodePortTemplate({
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
    ],
    outPorts: [
      createNodePortTemplate({
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
    ],
    nodeFactory: {
      className: "org.knime.base.node.preproc.filter.row.RowFilterNodeFactory",
    },
    name: "Row Filter",
    type: NativeNodeInvariants.TypeEnum.Manipulator,
  }),
];

const defaultPortMock = createPort();

const mockedAPI = deepMocked(API);

const $shortcuts = {
  isEnabled: () => true,
  findByHotkey: () => ["openQuickNodeInsertionMenu"],
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("QuickAddNodeMenu.vue", () => {
  type ComponentProps = InstanceType<typeof QuickAddNodeMenu>["$props"];
  const defaultProps: ComponentProps = {
    quickActionContext: {
      nodeId: "node-id",
      canvasPosition: { x: 14.5, y: 10 },
      port: createPort({
        index: 1,
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        connectedVia: [],
      }),
      nodeRelation: "SUCCESSORS",
      closeMenu: vi.fn(),
      updateMenuStyle: vi.fn(),
    },
  };

  type MounOpts = {
    nodeRecommendationsResponse?: NodeTemplate[];
    getNodeByIdMock?: Mock;
    isWriteableMock?: boolean;
    nodeRepositoryLoadedMock?: boolean;
  };

  const doMount = ({
    nodeRecommendationsResponse = defaultNodeRecommendationsResponse,
    isWriteableMock = true,
    getNodeByIdMock = vi.fn(),
    nodeRepositoryLoadedMock = true,
  }: MounOpts = {}) => {
    mockedAPI.noderepository.getNodeRecommendations.mockReturnValue(
      nodeRecommendationsResponse,
    );

    mockedAPI.noderepository.searchNodes.mockImplementation(() =>
      Promise.resolve(createSearchNodesResponse()),
    );

    mockedAPI.workflowCommand.AddNode.mockReturnValue({});

    const mockedStores = mockStores();
    (mockedStores.workflowStore.isWritable as any) = isWriteableMock;
    (mockedStores.workflowStore.workflowBounds as any) = {};
    mockedStores.workflowStore.activeWorkflow = createWorkflow({
      info: {
        containerId: "container0",
      },
      projectId: "project0",
      nodes: {},
      metaInPorts: {
        bounds: { x: 100 },
        ports: [defaultPortMock],
      },
      metaOutPorts: {
        bounds: { x: 702 },
        ports: [defaultPortMock, defaultPortMock, defaultPortMock],
      },
    });

    (mockedStores.nodeInteractionsStore.getNodeById as any) = getNodeByIdMock;
    (mockedStores.canvasStore.contentBounds as any) = {
      top: 33,
      height: 1236,
    };

    mockedStores.applicationStore.availablePortTypes = createAvailablePortTypes(
      {
        "org.some.otherPorType": {
          kind: PortType.KindEnum.Other,
          color: "blue",
          name: "Some other port",
        },
      },
    );

    mockedStores.applicationStore.nodeRepositoryLoaded =
      nodeRepositoryLoadedMock;
    mockedStores.applicationSettingsStore.hasNodeCollectionActive = true;
    mockedStores.applicationSettingsStore.hasNodeRecommendationsEnabled = true;

    const wrapper = mount(QuickAddNodeMenu, {
      props: defaultProps,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: {
          $shapes: {
            ...$shapes,
            // set port size to a fixed value so test will not fail if we change it.
            portSize: 10,
          },
          $colors,
        },
      },
      attachTo: document.body,
    });

    return {
      wrapper,
      mockedStores,
      $shortcuts,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("recommendations", () => {
    it("should display the nodes recommended", async () => {
      const { wrapper } = doMount();
      await nextTick();
      const nodes = wrapper.findAll(".node");

      expect(nodes.at(0)?.text()).toMatch("Column Filter");
      expect(nodes.at(1)?.text()).toMatch("Row Filter");

      const previews = wrapper.findAllComponents(NodePreview);

      expect(previews.length).toBe(2);
      expect(previews.at(0)?.props("type")).toBe("Manipulator");
    });

    it("adds node on click", async () => {
      const { wrapper, mockedStores } = doMount();
      await nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1?.trigger("click");

      expect(mockedStores.quickAddNodesStore.portTypeId).toBe(
        "org.knime.core.node.BufferedDataTable",
      );
      expect(
        mockedStores.nodeInteractionsStore.addNativeNode,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeFactory: {
            className:
              "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
          },
          position: {
            x: 19,
            y: -6,
          },
          autoConnectOptions: {
            sourceNodeId: "node-id",
            sourcePortIdx: 1,
            nodeRelation: "SUCCESSORS",
          },
        }),
      );
    });

    it("updates the QuickActionMenu style on mount", () => {
      doMount();
      expect(
        defaultProps.quickActionContext.updateMenuStyle,
      ).toHaveBeenCalledWith({ height: "445px", anchor: "top-left" });
    });

    it("allows dynamic updates of the port", async () => {
      const { wrapper, mockedStores } = doMount();
      await nextTick();
      expect(mockedStores.quickAddNodesStore.portTypeId).toBe(
        "org.knime.core.node.BufferedDataTable",
      );

      // update props
      await wrapper.setProps({
        quickActionContext: {
          ...defaultProps.quickActionContext,
          port: {
            index: 2,
            typeId: "org.some.otherPorType",
            connectedVia: [],
          },
        },
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(mockedStores.quickAddNodesStore.portTypeId).toBe(
        "org.some.otherPorType",
      );
      expect(API.noderepository.getNodeRecommendations).toHaveBeenCalledTimes(
        2,
      );
    });

    it("adds node in global mode where no source port exists", async () => {
      const { wrapper, mockedStores } = doMount();

      await nextTick();
      await wrapper.setProps({
        quickActionContext: {
          ...defaultProps.quickActionContext,
          nodeId: null,
          port: null,
          nodeRelation: null,
        },
      });
      await nextTick();

      const node1 = wrapper.findAll(".node").at(0);
      await node1?.trigger("click");

      expect(
        mockedStores.nodeInteractionsStore.addNativeNode,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeFactory: {
            className:
              "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
          },
          autoConnectOptions: {
            sourceNodeId: null,
            sourcePortIdx: undefined,
            nodeRelation: null,
          },
        }),
      );
      await flushPromises();
      expect(defaultProps.quickActionContext.closeMenu).toHaveBeenCalled();
    });

    it("triggers shortcut hotkey in search field to switch between ports", async () => {
      const { wrapper, $shortcuts } = doMount();
      await nextTick();
      const input = wrapper.find(".search-bar input");
      await input.trigger("keydown"); // key doesn't matter as its mocked

      expect($shortcuts.dispatch).toHaveBeenCalledWith(
        "openQuickNodeInsertionMenu",
      );
    });

    it("adds node on pressing enter key", async () => {
      const { wrapper, mockedStores } = doMount();
      await nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1?.trigger("keydown.enter");

      expect(
        mockedStores.nodeInteractionsStore.addNativeNode,
      ).toHaveBeenCalledWith({
        nodeFactory: {
          className:
            "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
        },
        position: {
          x: 19,
          y: -6,
        },
        autoConnectOptions: {
          sourceNodeId: "node-id",
          sourcePortIdx: 1,
          nodeRelation: "SUCCESSORS",
        },
      });
      await flushPromises();
      expect(defaultProps.quickActionContext.closeMenu).toHaveBeenCalled();
    });

    it("does not add node if workflow is not writeable", async () => {
      const { wrapper, mockedStores } = doMount({
        isWriteableMock: false,
      });
      await nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1?.trigger("click");

      expect(
        mockedStores.nodeInteractionsStore.addNativeNode,
      ).not.toHaveBeenCalled();
    });

    it("does display overlay if workflow coach is disabled", async () => {
      const { wrapper, mockedStores } = doMount();
      mockedStores.applicationSettingsStore.hasNodeRecommendationsEnabled =
        false;
      await nextTick();

      expect(wrapper.find(".disabled-workflow-coach").exists()).toBe(true);
    });

    it("does not display overlay if workflow coach is enabled", async () => {
      const { wrapper } = doMount();
      await nextTick();

      expect(wrapper.find(".disabled-workflow-coach").exists()).toBe(false);
    });

    it("opens workflow coach preferences page when button is clicked", async () => {
      const { wrapper, mockedStores } = doMount();
      mockedStores.applicationSettingsStore.hasNodeRecommendationsEnabled =
        false;
      await nextTick();
      await wrapper.findComponent(Button).vm.$emit("click");

      expect(API.desktop.openWorkflowCoachPreferencePage).toHaveBeenCalled();
    });

    it("displays placeholder message if there are no suggested nodes", async () => {
      const { wrapper } = doMount({ nodeRecommendationsResponse: [] });
      await nextTick();

      expect(wrapper.find(".no-recommendations-message").exists()).toBe(true);
    });
  });

  describe("search", () => {
    it("display search results if query was entered", async () => {
      const { wrapper } = doMount();
      await wrapper.find(".search-bar input").setValue("search");
      await new Promise((r) => setTimeout(r, 0));

      const nodes = wrapper.findAll(".node");

      expect(nodes.at(0)?.text()).toMatch("GroupBy Bar Chart (JFreeChart)");
      expect(nodes.at(1)?.text()).toMatch("Decision Tree Learner");

      const previews = wrapper.findAllComponents(NodePreview);

      expect(previews.length).toBe(2);
      expect(previews.at(0)?.props("type")).toBe("Visualizer");
    });

    describe("add node", () => {
      it("adds the first search result via enter in the search box to the workflow", async () => {
        const { wrapper, mockedStores } = doMount();
        const input = wrapper.find(".search-bar input");

        // trigger search
        await input.setValue("search");
        await new Promise((r) => setTimeout(r, 0));

        // press enter
        await input.trigger("keydown.enter");

        expect(
          mockedStores.nodeInteractionsStore.addNativeNode,
        ).toHaveBeenCalledWith({
          nodeFactory: {
            className:
              "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
          },
          position: {
            x: 19,
            y: -6,
          },
          autoConnectOptions: {
            sourceNodeId: "node-id",
            sourcePortIdx: 1,
            nodeRelation: "SUCCESSORS",
          },
        });
        await flushPromises();
        expect(defaultProps.quickActionContext.closeMenu).toHaveBeenCalled();
      });

      it.each(["click", "keydown.enter"])(
        "adds search results via %s to workflow",
        async (event) => {
          const { wrapper, mockedStores } = doMount();

          const input = wrapper.find(".search-bar input");
          await input.setValue(`some-input-for-${event}`);
          await new Promise((r) => setTimeout(r, 0));

          const nodes = wrapper.findAll(".node");
          const node = nodes.at(1);

          await node?.trigger(event);

          expect(
            mockedStores.nodeInteractionsStore.addNativeNode,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              nodeFactory: {
                className:
                  "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
              },
              position: expect.anything(),
              autoConnectOptions: {
                sourceNodeId: "node-id",
                sourcePortIdx: 1,
                nodeRelation: "SUCCESSORS",
              },
            }),
          );
        },
      );
    });
  });

  it("shows loader if node repository is not loaded", () => {
    const { wrapper, mockedStores } = doMount({
      nodeRepositoryLoadedMock: false,
    });

    expect(
      mockedStores.lifecycleStore.subscribeToNodeRepositoryLoadingEvent,
    ).toHaveBeenCalled();
    expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(true);
  });
});
