export const changeNameCommand = (messageObject: any) => {
  const { nodeId, name } = messageObject.params.workflowCommand;

  const matcher = () =>
    messageObject.params.workflowCommand.kind ===
    "update_component_or_metanode_name";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: name,
            path: `/nodes/${nodeId}/name`,
            op: "replace",
          },
        ],
      },
    },
  });

  return { matcher, response };
};

export const changeLabelCommand = (messageObject: any) => {
  const { nodeId, label } = messageObject.params.workflowCommand;

  const matcher = () =>
    messageObject.params.workflowCommand.kind === "update_node_label";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: {
              text: {
                value: label,
                contentType: "text/plain",
              },
              textAlign: "center",
              styleRanges: [],
            },
            path: `/nodes/${nodeId}/annotation`,
            op: "add",
          },
        ],
      },
    },
  });

  return { matcher, response };
};
