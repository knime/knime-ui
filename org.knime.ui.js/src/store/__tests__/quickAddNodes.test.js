import { afterEach, describe, expect, it, vi } from "vitest";

/* eslint-disable max-lines */
import { API } from "@/api";
import { state as nodeSearchState } from "@/store/common/nodeSearch";
import {
  deepMocked,
  mockVuexStore,
  withPorts,
  withoutKeys,
} from "@/test/utils";

export const getNodeRecommendationsResponse = [
  {
    component: false,
    icon: "data:image/png;base64,xxx",
    name: "GroupBy Bar Chart (JFreeChart)",
    id: "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
    type: "Visualizer",
    inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
    outPorts: [],
  },
  {
    component: false,
    icon: "data:image/png;base64,xxx",
    name: "Decision Tree Learner",
    id: "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
    type: "Learner",
    inPorts: [],
    outPorts: [{ typeId: "org.some.otherPorType" }],
  },
];

const mockedAPI = deepMocked(API);

describe("Quick add node store", () => {
  const createStore = async () => {
    const availablePortTypes = {
      "org.knime.core.node.BufferedDataTable": {
        kind: "table",
        color: "green",
      },
      "org.some.otherPorType": {
        kind: "other",
        color: "blue",
      },
      "org.knime.ext.h2o.ports.H2OFramePortObject": {
        kind: "other",
        color: "red",
      },
    };
    // search is part of the node repo API
    mockedAPI.noderepository.getNodeRecommendations.mockReturnValue(
      getNodeRecommendationsResponse,
    );

    const store = mockVuexStore({
      quickAddNodes: await import("@/store/quickAddNodes"),
      workflow: {
        state: {
          activeWorkflow: {
            projectId: "proj1",
            info: { containerId: "wfId" },
          },
        },
      },
      application: {
        state: {
          availablePortTypes,
        },
      },
    });

    const dispatchSpy = vi.spyOn(store, "dispatch");

    return {
      dispatchSpy,
      availablePortTypes,
      store,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates an empty store", async () => {
    const { store } = await createStore();
    const nodeSearchStateKeys = Object.keys(nodeSearchState());

    // this makes sure the test is failing if you add a property and do not adjust the test
    expect(
      withoutKeys(store.state.quickAddNodes, nodeSearchStateKeys),
    ).toStrictEqual({
      recommendedNodes: null,
    });
  });

  describe("actions", () => {
    it("getNodeRecommendations", async () => {
      const { store, availablePortTypes } = await createStore();
      expect(store.state.quickAddNodes.recommendedNodes).toBeNull();

      await store.dispatch("quickAddNodes/getNodeRecommendations", {
        nodeId: "someId",
        portIdx: 0,
      });

      let responseWithPorts = withPorts(
        getNodeRecommendationsResponse,
        availablePortTypes,
      );
      expect(store.state.quickAddNodes.recommendedNodes).toStrictEqual(
        responseWithPorts,
      );
    });
  });
});
