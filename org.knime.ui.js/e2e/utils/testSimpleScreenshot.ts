import { expect } from "@playwright/test";
import { type Page } from "playwright-core";

import { mockWebsocket } from "../utils/mockWebsocket";

export const testSimpleScreenshot = async (page: Page, fixturePath: string) => {
  await mockWebsocket(page, fixturePath);
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const kanvasBox = await page.locator("#kanvas").boundingBox();

  await expect(page).toHaveScreenshot({
    clip: kanvasBox!,
  });
};
