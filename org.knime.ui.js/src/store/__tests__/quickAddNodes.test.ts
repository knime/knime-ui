/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import { deepMocked, withPorts } from "@/test/utils";
import { useApplicationStore } from "../application/application";
import { useWorkflowStore } from "../workflow/workflow";

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
  const createStore = () => {
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

    // eslint-disable-next-line no-undef
    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    // @ts-ignore
    useApplicationStore(testingPinia).setAvailablePortTypes(availablePortTypes);
    useWorkflowStore(testingPinia).activeWorkflow = {
      projectId: "proj1",
      // @ts-ignore
      info: { containerId: "wfId" },
    };

    const quickAddNodes = useQuickAddNodesStore(testingPinia);

    return {
      availablePortTypes,
      quickAddNodes,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("actions", () => {
    it("getNodeRecommendations", async () => {
      const { quickAddNodes, availablePortTypes } = createStore();
      expect(quickAddNodes.recommendedNodes).toStrictEqual([]);

      await quickAddNodes.getNodeRecommendations({
        nodeId: "someId",
        portIdx: 0,
      });

      const responseWithPorts = withPorts(
        getNodeRecommendationsResponse,
        availablePortTypes,
      );
      expect(quickAddNodes.recommendedNodes).toStrictEqual(responseWithPorts);
    });
  });
});
