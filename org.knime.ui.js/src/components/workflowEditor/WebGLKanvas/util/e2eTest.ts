/* eslint-disable no-undefined */
import {
  type Application,
  type Container,
  type ContainerChild,
  type Text,
} from "pixi.js";

import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { removeAnnotationStyles } from "../annotations/annotationStyles";

/**
 * Utility functions to help with E2E testing the WebGL Kanvas as it's tricky to
 * guess the coordinates of the elements on screen.
 * They are used by e2e tests in this repo but also by QA.
 */
export const initE2ETestUtils = (app: Application) => {
  let kanvasBox: DOMRect | undefined;

  const updateKanvasBox = () => {
    kanvasBox = getKanvasDomElement()?.getBoundingClientRect();
  };

  const getBoundsFromContainer = (container: Container<ContainerChild>) => {
    const { x, y, width, height } = container.getBounds();

    const xScreen = x + kanvasBox!.x;
    const yScreen = y + kanvasBox!.y;
    const xCenter = xScreen + width / 2;
    const yCenter = yScreen + height / 2;

    return {
      x: Math.floor(xScreen),
      y: Math.floor(yScreen),
      center: {
        x: Math.floor(xCenter),
        y: Math.floor(yCenter),
      },
      width: Math.floor(width),
      height: Math.floor(height),
    };
  };

  const getPixiContainer = (labels: (RegExp | string)[]) => {
    let container: Container<ContainerChild> | undefined = app.stage;

    for (const label of labels) {
      container = container?.getChildByLabel(label, true) ?? undefined;
    }

    return container;
  };

  const getPixiContainerBounds = (
    labels: (RegExp | string)[],
  ): (typeof bounds & { text?: string }) | undefined => {
    const container = getPixiContainer(labels);
    if (!container) {
      return undefined;
    }

    const bounds = getBoundsFromContainer(container);

    const isText = (
      containerOrText: Container | Text,
    ): containerOrText is Text => {
      return (containerOrText as Text).text !== undefined;
    };
    return isText(container) ? { ...bounds, text: container.text } : bounds;
  };

  const getPixiContainerChildren = (
    labels: (RegExp | string)[],
    filter?: RegExp | string,
  ) => {
    const container = getPixiContainer(labels);
    if (!container) {
      throw new Error(
        `getPixiContainerChildren: pixi container not found, path: ${labels}`,
      );
    }

    const results = filter
      ? container.getChildrenByLabel(filter, true)
      : container.children;

    return results;
  };

  const getPixiContainerChildrenBounds = (
    labels: Parameters<typeof getPixiContainerChildren>[0],
    filter?: Parameters<typeof getPixiContainerChildren>[1],
  ) =>
    getPixiContainerChildren(labels, filter).map((child) =>
      getBoundsFromContainer(child),
    );

  return {
    /**
     * Returns the bounds of common elements of a node.
     */
    getNode: (nodeId: string) => {
      updateKanvasBox();
      const nodeIdLabel = `Node__${nodeId}`;

      const torso = getPixiContainerBounds([nodeIdLabel, "NodeTorso"]);
      if (!torso) {
        throw new Error(`getNode: couldn't find node ${nodeId}`);
      }

      return {
        torso,
        name: getPixiContainerBounds([nodeIdLabel, "NodeNameText"])!,
        label: getPixiContainerBounds([
          `NodeLabel__${nodeId}`,
          "NodeLabelText",
        ]),
        state: getPixiContainerBounds([nodeIdLabel, "NodeState"]),
        inPorts: getPixiContainerChildrenBounds(
          [nodeIdLabel, "NodePorts"],
          /^Port__In-\d+$/,
        ),
        outPorts: getPixiContainerChildrenBounds(
          [nodeIdLabel, "NodePorts"],
          /^Port__Out-\d+$/,
        ),
        flowVarInPort: getPixiContainerBounds([
          nodeIdLabel,
          "NodePorts",
          "Port__defaultFlowVarIn",
        ]),
        flowVarOutPort: getPixiContainerBounds([
          nodeIdLabel,
          "NodePorts",
          "Port__defaultFlowVarOut",
        ]),
        addInPortPlaceholder: getPixiContainerBounds([
          nodeIdLabel,
          "NodePorts",
          "AddPortPlaceholder__input",
        ]),
        addOutPortPlaceholder: getPixiContainerBounds([
          nodeIdLabel,
          "NodePorts",
          "AddPortPlaceholder__output",
        ]),
      };
    },

    /**
     * Returns the bounds of the node action buttons. Make sure the node is hovered
     * before calling this function as only then the buttons are rendered.
     */
    getNodeActionButtons: (nodeId: string) => {
      updateKanvasBox();
      const nodeIdLabel = `Node__${nodeId}`;

      try {
        const actionButtons = getPixiContainerChildren(
          [nodeIdLabel, "ActionBar"],
          /^ActionButton__/,
        );
        return actionButtons.map((button) => ({
          ...getBoundsFromContainer(button),
          testId: button.label.replace("ActionButton__", ""),
        }));
      } catch (error) {
        throw new Error(
          `Make sure the node exists and is hovered before calling this function; ${
            (error as Error).message
          }`,
        );
      }
    },
    /**
     * Returns the bounds of the port action button. Make sure the port is selected
     * before calling this function as only then the button is rendered.
     */
    getPortActionButton: (nodeId: string, portId: string) => {
      const nodeIdLabel = `Node__${nodeId}`;
      const portIdLabel = `Port__${portId}`;

      try {
        const actionButton = getPixiContainer([
          nodeIdLabel,
          "NodePorts",
          portIdLabel,
          /^ActionButton__/,
        ]);
        return {
          ...getBoundsFromContainer(actionButton!),
          testId: actionButton!.label.replace("ActionButton__", ""),
        };
      } catch (error) {
        throw new Error(
          `Make sure the port is selected before calling this function; ${
            (error as Error).message
          }`,
        );
      }
    },

    /**
     * Returns the position of component placeholder.
     */
    getComponentPlaceholder: (componentPlaceholderId: string) => {
      updateKanvasBox();
      const componentPlaceholderIdLabel = `ComponentPlaceholder__${componentPlaceholderId}`;

      const bounds = getPixiContainerBounds([componentPlaceholderIdLabel]);

      if (!bounds) {
        throw new Error(
          `getComponentPlaceholder: couldn't find component placeholder ${componentPlaceholderIdLabel}`,
        );
      }

      return {
        ...bounds,
      };
    },

    /**
     * Returns the bounds and text of a workflow annotation.
     */
    getAnnotation: (annotationId: string) => {
      updateKanvasBox();
      const annotationIdLabel = `StaticWorkflowAnnotation__${annotationId}`;

      const bounds = getPixiContainerBounds([
        annotationIdLabel,
        "AnnotationText",
      ]);

      if (!bounds) {
        throw new Error(
          `getAnnotation: couldn't find annotation ${annotationId}`,
        );
      }

      const text = removeAnnotationStyles(bounds.text!);

      return {
        ...bounds,
        text,
      };
    },

    getMinimapCoordinates: () => {
      updateKanvasBox();

      const minimapBounds = getPixiContainerBounds(["Minimap"]);
      const cameraBounds = getPixiContainerBounds(["MinimapCamera"]);

      return {
        minimap: minimapBounds,
        camera: cameraBounds,
      };
    },
  };
};

export type E2ETestUtils = ReturnType<typeof initE2ETestUtils>;
