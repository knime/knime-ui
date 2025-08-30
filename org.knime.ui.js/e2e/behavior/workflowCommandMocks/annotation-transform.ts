export const annotationTransform = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind ===
    "transform_workflow_annotation";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: 345,
            path: "/workflowAnnotations/0/bounds/width",
            op: "replace",
          },
          {
            value: 225,
            path: "/workflowAnnotations/0/bounds/height",
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
