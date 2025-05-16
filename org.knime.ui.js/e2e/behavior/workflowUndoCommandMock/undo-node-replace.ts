export const undoNodeReplace = (_payload: any) => {
  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: 1293710628,
            path: "/nodes/root:1/outPorts/1/portContentVersion",
            op: "replace",
          },
          {
            value: 955,
            path: "/nodes/root:1/position/x",
            op: "replace",
          },
          {
            value: 881,
            path: "/nodes/root:1/position/y",
            op: "replace",
          },
          {
            value: {
              id: "root:2",
              state: {
                executionState: "IDLE",
                warning: "At least one filter criterion is needed.",
                resolutions: [],
              },
              inputContentVersion: 1293710628,
              allowedActions: {
                canExecute: true,
                canCancel: false,
                canOpenLegacyFlowVariableDialog: true,
                canDelete: true,
                canReset: false,
                canCollapse: "true",
              },
              templateId:
                "org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory",
              dialogType: "web",
              kind: "node",
              position: {
                x: 1213,
                y: 880,
              },
              inPorts: [
                {
                  name: "Variable Inport",
                  index: 0,
                  connectedVia: [],
                  canRemove: false,
                  optional: true,
                  typeId:
                    "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
                },
                {
                  name: "Input Table",
                  index: 1,
                  connectedVia: [],
                  canRemove: false,
                  optional: false,
                  typeId: "org.knime.core.node.BufferedDataTable",
                },
              ],
              outPorts: [
                {
                  name: "Variable Outport",
                  index: 0,
                  connectedVia: [],
                  portContentVersion: -1532197330,
                  canRemove: false,
                  typeId:
                    "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
                },
                {
                  name: "Included Rows",
                  index: 1,
                  connectedVia: [],
                  canRemove: false,
                  typeId: "org.knime.core.node.BufferedDataTable",
                },
              ],
            },
            path: "/nodes/root:2",
            op: "add",
          },
          {
            value: {
              name: "Row Filter",
              type: "Manipulator",
              icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowYjM2YWM5Ny01ZWJhLTQwZTctOTE4OS1iYmU4ZDdkMGYyNGUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Rjk3QThFRUE0NDFDMTFFNUI4QUY5RjNFOUEzQTE4QjIiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Rjk3QThFRTk0NDFDMTFFNUI4QUY5RjNFOUEzQTE4QjIiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpiNmRiZTRmOC00Yzc3LTQyZGUtOGI5NC00ZGExNTM3Y2Q1M2YiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MGIzNmFjOTctNWViYS00MGU3LTkxODktYmJlOGQ3ZDBmMjRlIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+JOw8vQAAAJVJREFUeNqkUgEKwCAI9KL/f9ll6BCntrGDkEhPu3MwM8WzwBrTuz+DCgDYRStShymJHYmElqBIMNK+/cJo3lBN5b81TZyQdGeoDpFMSNCK6BwwUkpIjiKeJOBBPyEa4EtBmBjzxZiUCW0uVS7sBbI33UpvBtI9kATvYLg/iqVB64JuJLpvpSIaaRg71aMUMSvOcAkwALIaZjL1MMxxAAAAAElFTkSuQmCC",
              nodeFactory: {
                className:
                  "org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory",
              },
            },
            path: "/nodeTemplates/org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory",
            op: "add",
          },
          {
            value: false,
            path: "/allowedActions/canUndo",
            op: "replace",
          },
          {
            value: true,
            path: "/allowedActions/canRedo",
            op: "replace",
          },
        ],
      },
    },
  });

  return { response };
};
