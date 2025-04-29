export const replaceNode = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind === "replace_node";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            path: "/nodes/root:1/outPorts/1/connectedVia/0",
            op: "remove",
          },
          {
            value: 1213,
            path: "/nodes/root:1/position/x",
            op: "replace",
          },
          {
            value: 880,
            path: "/nodes/root:1/position/y",
            op: "replace",
          },
          {
            path: "/nodes/root:2",
            op: "remove",
          },
          {
            path: "/nodeTemplates/org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory",
            op: "remove",
          },
          {
            path: "/connections/root:2_1",
            op: "remove",
          },
          {
            value: true,
            path: "/allowedActions/canUndo",
            op: "replace",
          },
          {
            value: true,
            path: "/dirty",
            op: "replace",
          },
        ],
      },
    },
  });

  return { matcher, response };
};
