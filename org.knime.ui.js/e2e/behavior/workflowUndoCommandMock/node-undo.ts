export const undoNodePosition = (_payload: any, data: { nodeId: string }) => {
  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: 955,
            path: `/nodes/${data.nodeId}/position/x`,
            op: "replace",
          },
          {
            value: 881,
            path: `/nodes/${data.nodeId}/position/y`,
            op: "replace",
          },
          { value: false, path: "/allowedActions/canUndo", op: "replace" },
          { value: true, path: "/allowedActions/canRedo", op: "replace" },
        ],
      },
    },
  });

  return { response };
};
