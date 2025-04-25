export const nodeTranslate = (messageObject: any) => {
  const {
    nodeIds: [nodeId],
  } = messageObject.params.workflowCommand;

  const matcher = () =>
    messageObject.params.workflowCommand.kind === "translate";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: 1055,
            path: `/nodes/${nodeId}/position/x`,
            op: "replace",
          },
          {
            value: 781,
            path: `/nodes/${nodeId}/position/y`,
            op: "replace",
          },
          { value: true, path: "/allowedActions/canUndo", op: "replace" },
          { value: false, path: "/allowedActions/canRedo", op: "replace" },
        ],
      },
    },
  });

  return { matcher, response };
};
