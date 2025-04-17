import { expect } from "@playwright/test";
import { Page } from "playwright-core";

import { mockWebsocket } from "./mockWebsocket";

type StartApplicationHelperOptions = {
  workflowFixturePath: string;
  withMouseCursor?: boolean;
  waitForRender?: boolean;
};

export const startApplication = async (
  page: Page,
  options: StartApplicationHelperOptions,
) => {
  const {
    workflowFixturePath,
    waitForRender = true,
    withMouseCursor = false,
  } = options;

  if (withMouseCursor) {
    await page.addInitScript({
      path: "./node_modules/mouse-helper/dist/mouse-helper.js",
    });
  }

  await mockWebsocket(page, workflowFixturePath);
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
