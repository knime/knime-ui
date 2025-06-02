export const addCredentialPort = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind === "add_port";

  const response = () => ({
    eventType: "WorkflowChangedEvent:ProjectDirtyStateEvent",
    payload: {
      events: [
        {
          patch: {
            ops: [
              {
                value: {
                  name: "Credential",
                  index: 2,
                  connectedVia: [],
                  portGroupId: "Credential",
                  canRemove: true,
                  optional: false,
                  typeId: "org.knime.credentials.base.CredentialPortObject",
                },
                path: "/nodes/root:3/inPorts/2",
                op: "add",
              },
              {
                value: 2,
                path: "/nodes/root:3/portGroups/Credential/inputRange/0",
                op: "add",
              },
              {
                value: 2,
                path: "/nodes/root:3/portGroups/Credential/inputRange/1",
                op: "add",
              },
              {
                value: false,
                path: "/nodes/root:3/portGroups/Credential/canAddInPort",
                op: "replace",
              },
            ],
          },
          snapshotId: "18",
        },
        {
          snapshotId: "3",
          patch: {
            ops: [
              {
                value: {
                  name: "Additional tables to concatenate",
                  index: 4,
                  optional: false,
                  typeId: "org.knime.core.node.BufferedDataTable",
                  portGroupId: "input",
                  canRemove: true,
                  connectedVia: [],
                },
                path: "/nodes/root:20/inPorts/4",
                op: "add",
              },
              {
                value: 4,
                path: "/nodes/root:20/portGroups/input/inputRange/1",
                op: "replace",
              },
              { value: true, path: "/allowedActions/canUndo", op: "replace" },
              { value: true, path: "/dirty", op: "replace" },
            ],
          },
        },
      ],
    },
  });

  return { matcher, response };
};

export const addTablePort = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind === "add_port";
  const response = () => ({
    eventType: "WorkflowChangedEvent:ProjectDirtyStateEvent",
    payload: {
      events: [
        {
          snapshotId: "3",
          patch: {
            ops: [
              {
                value: {
                  name: "Additional tables to concatenate",
                  index: 4,
                  optional: false,
                  typeId: "org.knime.core.node.BufferedDataTable",
                  portGroupId: "input",
                  canRemove: true,
                  connectedVia: [],
                },
                path: "/nodes/root:20/inPorts/4",
                op: "add",
              },
              {
                value: 4,
                path: "/nodes/root:20/portGroups/input/inputRange/1",
                op: "replace",
              },
              { value: true, path: "/allowedActions/canUndo", op: "replace" },
              { value: true, path: "/dirty", op: "replace" },
            ],
          },
        },
      ],
    },
  });
  return { matcher, response };
};

export const removeNodePort = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind === "remove_port";
  const response = () => ({
    eventType: "WorkflowChangedEvent:ProjectDirtyStateEvent",
    payload: {
      events: [
        {
          patch: {
            ops: [
              { path: "/nodes/root:20/inPorts/3", op: "remove" },
              {
                value: 1432881166,
                path: "/nodes/root:20/outPorts/1/portContentVersion",
                op: "add",
              },
              {
                value: -1985576583,
                path: "/nodes/root:20/inputContentVersion",
                op: "replace",
              },
              {
                value: "CONFIGURED",
                path: "/nodes/root:20/state/executionState",
                op: "replace",
              },
              {
                value: 2,
                path: "/nodes/root:20/portGroups/input/inputRange/1",
                op: "replace",
              },
            ],
          },
          snapshotId: "31",
        },
      ],
    },
  });

  return { matcher, response };
};
