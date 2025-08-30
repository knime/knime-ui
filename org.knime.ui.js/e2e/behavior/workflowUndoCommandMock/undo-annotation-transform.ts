export const undoAnnotationTransform = (_payload: any) => {
  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: 545,
            path: "/workflowAnnotations/0/bounds/width",
            op: "replace",
          },
          {
            value: 425,
            path: "/workflowAnnotations/0/bounds/height",
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
