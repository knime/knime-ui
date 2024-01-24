import { expect, describe, it, vi, beforeEach } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import Button from "webapps-common/ui/components/Button.vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import { deepMocked, lodashMockFactory, mockVuexStore } from "@/test/utils";
import {
  createAvailablePortTypes,
  createPort,
  createNodePortTemplate,
  createNodeTemplate,
  createSearchNodesResponse,
  createSearchAllNodesResponse,
} from "@/test/factories";

import { API } from "@api";
import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import * as quickAddNodesStore from "@/store/quickAddNodes";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import * as settingsStore from "@/store/settings";

import FloatingMenu from "@/components/common/FloatingMenu.vue";
import QuickAddNodeRecommendations from "@/components/workflow/node/quickAdd/QuickAddNodeRecommendations.vue";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";

import {
  NativeNodeInvariants,
  PortType,
} from "@/api/gateway-api/generated-api";
import QuickAddNodeMenu from "../QuickAddNodeMenu.vue";

vi.mock("lodash-es", async () => {
  const actual = await vi.importActual("lodash-es");

  return {
    ...actual,
    ...lodashMockFactory(),
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

const allNodesSearchResult = createSearchAllNodesResponse();

const defaultPortMock = createPort();

const mockedAPI = deepMocked(API);

describe("QuickAddNodeMenu.vue", () => {
  const FloatingMenuStub = {
    template: `
          <div>
          <slot />
          </div>`,
    props: FloatingMenu.props,
  };

  const doMount = ({
    addNodeMock = vi.fn(),
    props = {},
    nodeRecommendationsResponse = defaultNodeRecommendationsResponse,
    isWriteableMock = vi.fn().mockReturnValue(true),
    getNodeByIdMock = vi.fn(),
    nodeRepositoryLoadedMock = true,
  } = {}) => {
    const defaultProps = {
      nodeId: "node-id",
      position: {
        x: 10,
        y: 10,
      },
      port: createPort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
        connectedVia: [],
      }),
    };

    mockedAPI.noderepository.getNodeRecommendations.mockReturnValue(
      nodeRecommendationsResponse,
    );

    mockedAPI.noderepository.searchNodes.mockImplementation(
      ({ nodesPartition }) =>
        nodesPartition === "IN_COLLECTION"
          ? Promise.resolve(createSearchNodesResponse())
          : Promise.resolve(allNodesSearchResult),
    );
    const subscribeToNodeRepositoryLoadingEventMock = vi.fn();

    const storeConfig = {
      canvas: {
        state: () => ({
          zoomFactor: 1,
        }),
        getters: {
          contentBounds() {
            return {
              top: 33,
              height: 1236,
            };
          },
        },
      },
      quickAddNodes: quickAddNodesStore,
      application: {
        state: {
          availablePortTypes: createAvailablePortTypes({
            "org.some.otherPorType": {
              kind: PortType.KindEnum.Other,
              color: "blue",
              name: "Some other port",
            },
          }),
          hasNodeCollectionActive: true,
          hasNodeRecommendationsEnabled: true,
          nodeRepositoryLoaded: nodeRepositoryLoadedMock,
        },
        actions: {
          subscribeToNodeRepositoryLoadingEvent:
            subscribeToNodeRepositoryLoadingEventMock,
        },
      },
      selection: selectionStore,
      settings: settingsStore,
      workflow: {
        state: {
          ...workflowStore.state(),
          activeWorkflow: {
            info: {
              containerId: "container0",
            },
            projectId: "project0",
            nodes: {},
            metaInPorts: {
              xPos: 100,
              ports: [defaultPortMock],
            },
            metaOutPorts: {
              xPos: 702,
              ports: [defaultPortMock, defaultPortMock, defaultPortMock],
            },
          },
        },
        actions: {
          addNode: addNodeMock,
        },
        getters: {
          isWritable: isWriteableMock,
          getNodeById: () => getNodeByIdMock,
          workflowBounds: () => ({}),
        },
      },
    };

    const $shortcuts = {
      isEnabled: vi.fn().mockReturnValue(true),
      findByHotkey: vi.fn().mockReturnValue("quickAddNode"),
      dispatch: vi.fn(),
    };

    const $store = mockVuexStore(storeConfig);

    const wrapper = mount(QuickAddNodeMenu, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: {
          $shapes: {
            ...$shapes,
            // set port size to a fixed value so test will not fail if we change it.
            portSize: 10,
          },
          $colors,
          $shortcuts,
        },
        stubs: {
          FloatingMenu: FloatingMenuStub,
        },
      },
      attachTo: document.body,
    });

    return {
      wrapper,
      $store,
      addNodeMock,
      $shortcuts,
      subscribeToNodeRepositoryLoadingEventMock,
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("visuals", () => {
    it("re-emits menuClose", () => {
      const { wrapper } = doMount();
      wrapper.findComponent(FloatingMenuStub).vm.$emit("menuClose");

      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("centers to port", () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(FloatingMenuStub).props("canvasPosition"),
      ).toStrictEqual({
        x: 15,
        y: 10,
      });
    });
  });

  describe("recommendations", () => {
    it("should display the nodes recommended", async () => {
      const { wrapper } = doMount();
      await Vue.nextTick();
      const nodes = wrapper.findAll(".node");

      expect(nodes.at(0).text()).toMatch("Column Filter");
      expect(nodes.at(1).text()).toMatch("Row Filter");

      const previews = wrapper.findAllComponents(NodePreview);

      expect(previews.length).toBe(2);
      expect(previews.at(0).props("type")).toBe("Manipulator");
    });

    it("adds node on click", async () => {
      const { wrapper, addNodeMock } = doMount();
      await Vue.nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1.trigger("click");

      expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
        nodeFactory: {
          className:
            "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
        },
        position: {
          x: 19.5,
          y: -6,
        },
        sourceNodeId: "node-id",
        sourcePortIdx: 1,
      });
    });

    it("allows dynamic updates of the port", async () => {
      const { wrapper, $store } = doMount();
      await Vue.nextTick();
      expect($store.state.quickAddNodes.portTypeId).toBe(
        "org.knime.core.node.BufferedDataTable",
      );

      // update props
      await wrapper.setProps({
        port: {
          index: 2,
          typeId: "org.some.otherPorType",
          kind: "table",
          connectedVia: [],
        },
      });
      await new Promise((r) => setTimeout(r, 0));

      expect($store.state.quickAddNodes.portTypeId).toBe(
        "org.some.otherPorType",
      );
      expect(API.noderepository.getNodeRecommendations).toHaveBeenCalledTimes(
        2,
      );
    });

    it("adds node in global mode where no source port exists", async () => {
      const props = {
        nodeId: null,
        port: null,
      };
      const { wrapper, addNodeMock, $store } = doMount({ props });

      await Vue.nextTick();

      const node1 = wrapper.findAll(".node").at(0);
      await node1.trigger("click");

      expect($store.state.quickAddNodes.portTypeId).toBeNull();
      expect(addNodeMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nodeFactory: {
            className:
              "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
          },
          sourceNodeId: null,
          sourcePortIdx: null,
        }),
      );
    });

    it("triggers shortcut hotkey in search field to switch between ports", async () => {
      const { wrapper, $shortcuts } = doMount();
      await Vue.nextTick();
      const input = wrapper.find(".search-bar input");
      await input.trigger("keydown"); // key doesn't matter as its mocked

      expect($shortcuts.dispatch).toHaveBeenCalledWith("quickAddNode");
    });

    it("adds node on pressing enter key", async () => {
      const { wrapper, addNodeMock } = doMount();
      await Vue.nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1.trigger("keydown.enter");

      expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
        nodeFactory: {
          className:
            "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
        },
        position: {
          x: 19.5,
          y: -6,
        },
        sourceNodeId: "node-id",
        sourcePortIdx: 1,
      });
    });

    it("does not add node if workflow is not writeable", async () => {
      const { wrapper, addNodeMock } = doMount({
        isWriteableMock: vi.fn(() => false),
      });
      await Vue.nextTick();
      const node1 = wrapper.findAll(".node").at(0);
      await node1.trigger("click");

      expect(addNodeMock).toHaveBeenCalledTimes(0);
    });

    it("does display overlay if workflow coach is disabled", async () => {
      const { wrapper, $store } = doMount();
      $store.state.application.hasNodeRecommendationsEnabled = false;
      await Vue.nextTick();

      expect(wrapper.find(".disabled-workflow-coach").exists()).toBe(true);
    });

    it("does not display overlay if workflow coach is enabled", async () => {
      const { wrapper } = doMount();
      await Vue.nextTick();

      expect(wrapper.find(".disabled-workflow-coach").exists()).toBe(false);
    });

    it("opens workflow coach preferences page when button is clicked", async () => {
      const { wrapper, $store } = doMount();
      $store.state.application.hasNodeRecommendationsEnabled = false;
      await Vue.nextTick();
      await wrapper.findComponent(Button).vm.$emit("click");

      expect(API.desktop.openWorkflowCoachPreferencePage).toHaveBeenCalled();
    });

    it("displays placeholder message if there are no suggested nodes", async () => {
      const { wrapper } = doMount({ nodeRecommendationsResponse: [] });
      await Vue.nextTick();

      expect(wrapper.find(".no-recommendations-message").exists()).toBe(true);
    });

    it.each([["metanode"], ["component"]])(
      "disable recommendations if node kind is %s",
      async (nodeKind) => {
        const { wrapper } = doMount({
          getNodeByIdMock: vi.fn().mockReturnValue({ kind: nodeKind }),
        });
        const recommendations = wrapper.findComponent(
          QuickAddNodeRecommendations,
        );
        expect(recommendations.props("disableRecommendations")).toBe(true);
        expect(wrapper.find(".no-recommendations-message").exists()).toBe(true);
        await Vue.nextTick();
        expect(API.noderepository.getNodeRecommendations).toHaveBeenCalledTimes(
          0,
        );
      },
    );
  });

  describe("search", () => {
    it("display search results if query was entered", async () => {
      const { wrapper } = doMount();
      await wrapper.find(".search-bar input").setValue("search");
      await new Promise((r) => setTimeout(r, 0));

      const nodes = wrapper.findAll(".node");

      expect(nodes.at(0).text()).toMatch("GroupBy Bar Chart (JFreeChart)");
      expect(nodes.at(1).text()).toMatch("Decision Tree Learner");

      const previews = wrapper.findAllComponents(NodePreview);

      expect(previews.length).toBe(2);
      expect(previews.at(0).props("type")).toBe("Visualizer");
    });

    describe("add node", () => {
      it("adds the first search result via enter in the search box to the workflow", async () => {
        const { wrapper, addNodeMock } = doMount();
        const input = wrapper.find(".search-bar input");

        // trigger search
        await input.setValue("search");
        await new Promise((r) => setTimeout(r, 0));

        // press enter
        await input.trigger("keydown.enter");

        expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
          nodeFactory: {
            className:
              "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
          },
          position: {
            x: 19.5,
            y: -6,
          },
          sourceNodeId: "node-id",
          sourcePortIdx: 1,
        });
      });

      it.each(["click", "keydown.enter"])(
        "adds search results via %s to workflow",
        async (event) => {
          const { wrapper, addNodeMock } = doMount();

          const input = wrapper.find(".search-bar input");
          await input.setValue(`some-input-for-${event}`);
          await new Promise((r) => setTimeout(r, 0));

          const nodes = wrapper.findAll(".node");
          const node = nodes.at(1);

          await node.trigger(event);

          expect(addNodeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              nodeFactory: {
                className:
                  "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
              },
              position: expect.anything(),
              sourceNodeId: "node-id",
              sourcePortIdx: 1,
            }),
          );
        },
      );
    });
  });

  it("shows loader if node repository is not loaded", () => {
    const { wrapper, subscribeToNodeRepositoryLoadingEventMock } = doMount({
      nodeRepositoryLoadedMock: false,
    });

    expect(subscribeToNodeRepositoryLoadingEventMock).toHaveBeenCalled();
    expect(wrapper.findComponent(NodeRepositoryLoader).exists()).toBe(true);
  });
});
