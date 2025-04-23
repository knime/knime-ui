/* eslint-disable no-undefined */
import { expect } from "@playwright/test";
import { Application, Container, ContainerChild } from "pixi.js";
import { Page } from "playwright-core";

import { mockWebsocket } from "./mockWebsocket";

export type WorkflowCommandFnMock = (payload: any) => {
  matcher: () => boolean;
  response: () => any;
};

type StartApplicationHelperOptions = {
  workflowFixturePath: string;
  withMouseCursor?: boolean;
  waitForRender?: boolean;
  workflowCommandFn?: WorkflowCommandFnMock;
};

export type CustomWindow = typeof window & {
  __PIXI_APP__: Application;
  __PERF_FPS_MEASUREMENT__?: {
    start: DOMHighResTimeStamp;
    frameCount: number;
    countFrames: () => void;
  };
};

export const startApplication = async (
  page: Page,
  options: StartApplicationHelperOptions,
) => {
  const {
    workflowFixturePath,
    waitForRender = true,
    withMouseCursor = false,
    workflowCommandFn,
  } = options;

  if (withMouseCursor) {
    await page.addInitScript({
      path: "./node_modules/mouse-helper/dist/mouse-helper.js",
    });
  }

  await mockWebsocket(page, { workflowFixturePath, workflowCommandFn });
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
  page.locator("#kanvas").boundingBox();

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

export const getPixiObjectCenter = (page: Page, labels: string[]) =>
  page.evaluate(
    ({ labels }) => {
      const pixiApp = (window as CustomWindow).__PIXI_APP__;

      let obj: Container<ContainerChild> | undefined = pixiApp.stage;

      labels.forEach(
        (label) => (obj = obj?.getChildByLabel(label, true) ?? undefined),
      );

      if (!obj) {
        throw new Error(
          `getPixiObjectCenter: pixi object not found, path: ${labels}`,
        );
      }

      const bounds = obj.getBounds();

      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
    },
    { labels },
  );

export const getPixiObjectAttributes = (
  page: Page,
  labels: string[],
  attributes: string[],
) =>
  page.evaluate(
    ({ labels, attributes }) => {
      const pixiApp = (window as CustomWindow).__PIXI_APP__;

      let obj: Container<ContainerChild> | undefined = pixiApp.stage;

      labels.forEach(
        (label) => (obj = obj?.getChildByLabel(label, true) ?? undefined),
      );

      if (!obj) {
        throw new Error(
          `getPixiObjectCenter: pixi object not found, path: ${labels}`,
        );
      }

      return Object.fromEntries(attributes.map((a) => [a, obj![a]]));
    },
    { labels, attributes },
  );
