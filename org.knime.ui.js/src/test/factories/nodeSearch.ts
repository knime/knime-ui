import {
  NativeNodeInvariants,
  type NodeSearchResult,
} from "@/api/gateway-api/generated-api";

export const createSearchNodesResponse = (): NodeSearchResult => ({
  tags: ["Analytics", "Integrations", "KNIME Labs"],
  totalNumNodesFound: 1355,
  totalNumFilteredNodesFound: 10,
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

export const createSearchAllNodesResponse = (): NodeSearchResult => ({
  tags: ["H2O Machine Learning", "R"],
  totalNumNodesFound: 122,
  totalNumFilteredNodesFound: 0,
  nodes: [
    {
      name: "H2O to Table",
      id: "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory",
      type: NativeNodeInvariants.TypeEnum.Manipulator,
      component: false,
      icon: "data:image/png;base64,xxx",
      inPorts: [
        {
          optional: false,
          typeId: "org.knime.ext.h2o.ports.H2OFramePortObject",
        },
      ],
      outPorts: [
        {
          optional: false,
          typeId: "org.knime.core.node.BufferedDataTable",
        },
      ],
      nodeFactory: {
        className:
          "org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory",
      },
    },
    {
      name: "R Source (Table)",
      id: "org.knime.r.RReaderTableNodeFactory",
      type: NativeNodeInvariants.TypeEnum.Source,
      component: false,
      icon: "data:image/png;base64,xxx",
      inPorts: [],
      outPorts: [
        {
          optional: false,
          typeId: "org.knime.core.node.BufferedDataTable",
        },
      ],
      nodeFactory: {
        className: "org.knime.r.RReaderTableNodeFactory",
      },
    },
  ],
});
