export const addNodePort = (messageObject: any) => {
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
          shouldReplace: false,
          dirtyProjectsMap: {
            "remove_optional_ports_2e11987e-5bf4-43d0-b165-175b7d792011": true,
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
        {
          shouldReplace: false,
          dirtyProjectsMap: {
            "remove_optional_ports_2e11987e-5bf4-43d0-b165-175b7d792011": true,
          },
        },
      ],
    },
  });

  return { matcher, response };
};
