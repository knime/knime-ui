import { expect } from "@playwright/test";
import { Page } from "playwright-core";

import { KANVAS_ID } from "../../src/util/getKanvasDomElement";

import { mockWebsocket } from "./mockWebsocket";
import { StartApplicationHelperOptions } from "./types";

export const startApplication = async (
  page: Page,
  options: StartApplicationHelperOptions,
) => {
  const {
    workflowFixturePath,
    waitForRender = true,
    withMouseCursor = false,
    workflowCommandFn,
    workflowUndoCommand,
  } = options;

  if (withMouseCursor) {
    await page.addInitScript({
      path: "./node_modules/mouse-helper/dist/mouse-helper.js",
    });
  }

  await mockWebsocket(page, {
    workflowFixturePath,
    workflowCommandFn,
    workflowUndoCommand,
  });
  await page.goto("/");

  if (waitForRender) {
    // TODO: NXT-3621 investigate how to improve this
    await page.waitForSelector('body[data-first-render="done"]');
  }

  if (withMouseCursor) {
    await page.evaluate(() => {
      window["mouse-helper"]();
    });
  }
};

export const getKanvasBoundingBox = (page: Page) =>
  page.locator(`#${KANVAS_ID}`).boundingBox();

export const assertSnapshot = async (page: Page) => {
  const kanvasBox = await getKanvasBoundingBox(page);
  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
};

export const testSimpleScreenshot = async (
  page: Page,
  options: StartApplicationHelperOptions,
) => {
  await startApplication(page, options);
  const kanvasBox = await getKanvasBoundingBox(page);

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
};

export const pointToArray = ({
  x,
  y,
}: {
  x: number;
  y: number;
}): [number, number] => {
  return [x, y];
};

export const getCenter = ({
  center,
}: {
  center: { x: number; y: number };
}): [number, number] => {
  return pointToArray(center);
};

export const getNode = async (page: Page, id: string) => {
  const node = await page.evaluate(
    ({ id }) => {
      return window.__E2E_TEST__.getNode(id);
    },
    { id },
  );

  return node;
};

export const getNodePosition = async (
  page: Page,
  id: string,
): Promise<[number, number]> => {
  const node = await getNode(page, id);

  return getCenter(node.torso);
};

export const getNodeActionButtons = async (page: Page, id: string) => {
  const actionButtons = await page.evaluate(
    ({ id }) => {
      return window.__E2E_TEST__.getNodeActionButtons(id);
    },
    { id },
  );

  return actionButtons;
};

export const getAnnotation = async (page: Page, id: string) => {
  const annotation = await page.evaluate(
    ({ id }) => {
      return window.__E2E_TEST__.getAnnotation(id);
    },
    { id },
  );
  return annotation;
};

export const getAddPortPlaceholder = async (
  page: Page,
  id: string,
  side: "input" | "output",
) => {
  const node = await getNode(page, id);
  const addPortPlaceholder =
    side === "input" ? node.addInPortPlaceholder : node.addOutPortPlaceholder;
  return addPortPlaceholder;
};

export const getPortActionButton = async (
  page: Page,
  nodeId: string,
  portId: string,
) => {
  const actionButton = await page.evaluate(
    ({ nodeId, portId }) => {
      return window.__E2E_TEST__.getPortActionButton(nodeId, portId);
    },
    { nodeId, portId },
  );

  return actionButton;
};
