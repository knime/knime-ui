export const nodeAdd = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind === "add_node";

  const commandResult = () => ({
    kind: "add_node_result",
    snapshotId: "1",
    newNodeId: "root:7",
  });

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      snapshotId: "1",
      patch: {
        ops: [
          {
            value: {
              id: "root:7",
              state: {
                warning: "Please specify a file",
                resolutions: [],
                executionState: "IDLE",
              },
              kind: "node",
              hasView: false,
              inPorts: [
                {
                  name: "Variable Inport",
                  index: 0,
                  optional: true,
                  typeId:
                    "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
                  canRemove: false,
                  connectedVia: [],
                },
              ],
              outPorts: [
                {
                  name: "Variable Outport",
                  index: 0,
                  typeId:
                    "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
                  portContentVersion: -337043238,
                  canRemove: false,
                  connectedVia: [],
                },
                {
                  name: "File Table",
                  index: 1,
                  typeId: "org.knime.core.node.BufferedDataTable",
                  canRemove: false,
                  connectedVia: [],
                },
              ],
              dialogType: "swing",
              allowedActions: {
                canExecute: false,
                canCancel: false,
                canReset: false,
                canCollapse: "true",
                canDelete: true,
              },
              templateId:
                "org.knime.ext.poi3.node.io.filehandling.excel.reader.ExcelTableReaderNodeFactory",
              portGroups: {
                "File System Connection": {
                  inputRange: [],
                  outputRange: [],
                  canAddInPort: true,
                  supportedPortTypeIds: [
                    "org.knime.filehandling.core.port.FileSystemPortObject",
                  ],
                },
              },
              position: {
                x: 940,
                y: 695,
              },
            },
            path: "/nodes/root:7",
            op: "add",
          },
          {
            value: {
              name: "Excel Reader",
              type: "Source",
              icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADPSURBVHgBtVFBDoIwEByIiSfrA2xAH0A8C1E+4l+Es+EXHrkazsTg3fAAhfABevOEQFISlNImxEmazna3050uMBHa2jBO9e5J6rxXnvsigQoKqAW0oXOdk2eWtUsUizDjZGtZeKQpzkEAVFV3JkPPAqUUtyRp+d5xUBRFV2jQ1XgH3yCE9OL4+P6pcS/zvkDzehiGYGWJaxS1FhhjULLAP2xjmhiKRRaUx8gFXcdGnNw73ozRl11ekoUwp4kSB3un1BnGBDjGuI6J+J8FVXwArGpkXrM0Y1EAAAAASUVORK5CYII=",
              nodeFactory: {
                className:
                  "org.knime.ext.poi3.node.io.filehandling.excel.reader.ExcelTableReaderNodeFactory",
              },
            },
            path: "/nodeTemplates/org.knime.ext.poi3.node.io.filehandling.excel.reader.ExcelTableReaderNodeFactory",
            op: "add",
          },
          {
            value: true,
            path: "/allowedActions/canUndo",
            op: "replace",
          },
        ],
      },
    },
  });

  return { matcher, response, commandResult };
};
