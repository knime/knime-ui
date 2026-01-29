export const componentAdd =
  (insertionPosition: { x: number; y: number }) => (messageObject: any) => {
    const matcher = () =>
      messageObject.params.workflowCommand.kind === "add_component";

    const componentPlaceholderId = "a2918ecc-06db-419e-b831-f30209f44061";

    const commandResult = () => ({
      kind: "add_component_placeholder_result",
      snapshotId: "12",
      newPlaceholderId: componentPlaceholderId,
    });

    const response = () => ({
      eventType: "WorkflowChangedEvent",
      payload: {
        snapshotId: "12",
        patch: {
          ops: [
            {
              value: [
                {
                  position: insertionPosition,
                  name: "Style Transfer in python",
                  id: componentPlaceholderId,
                  state: "LOADING",
                },
              ],
              path: "/componentPlaceholders",
              op: "add",
            },
          ],
        },
      },
    });

    return { matcher, response, commandResult };
  };
