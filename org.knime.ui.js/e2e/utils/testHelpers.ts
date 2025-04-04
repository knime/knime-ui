import { Page } from "playwright-core";

import { mockWebsocket } from "./mockWebsocket";

export const startApplication = async (
  page: Page,
  options: { workflowFixturePath: string; withMouseCursor?: boolean },
) => {
  if (options.withMouseCursor) {
    await page.addInitScript({
      path: "./node_modules/mouse-helper/dist/mouse-helper.js",
    });
  }

  await mockWebsocket(page, options.workflowFixturePath);
  await page.goto("/");
  // TODO: NXT-3621 investigate how to improve this
  await page.waitForSelector('body[data-first-render="done"]');

  if (options.withMouseCursor) {
    await page.evaluate(() => {
      window["mouse-helper"]();
    });
  }
};

export const getKanvasBoundingBox = (page: Page) =>
  page.locator("#kanvas").boundingBox();
