import {
  NativeNodeInvariants,
  type NodeSearchResult,
} from "@/api/gateway-api/generated-api";

export const createSearchNodesResponse = (): NodeSearchResult => ({
  tags: ["Analytics", "Integrations", "KNIME Labs"],
  totalNumNodes: 1355,
  totalNonPartitionNodes: 10,
  nodes: [
    {
      component: false,
      icon: "data:image/png;base64,xxx",
      name: "GroupBy Bar Chart (JFreeChart)",
      id: "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
      type: NativeNodeInvariants.TypeEnum.Visualizer,
      nodeFactory: {
        className:
          "org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory",
      },
      inPorts: [{ typeId: "org.knime.core.node.BufferedDataTable" }],
      outPorts: [],
    },
    {
      component: false,
      icon: "data:image/png;base64,xxx",
      name: "Decision Tree Learner",
      id: "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
      nodeFactory: {
        className:
          "org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3",
      },
      type: NativeNodeInvariants.TypeEnum.Learner,
      inPorts: [],
      outPorts: [{ typeId: "org.some.otherPorType" }],
    },
  ],
});
