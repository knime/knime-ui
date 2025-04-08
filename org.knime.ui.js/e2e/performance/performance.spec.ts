/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */

import { expect, test } from "@playwright/test";
import playwright from "playwright";

/* eslint-disable no-process-env */
import { getBrowserState } from "../utils/browserState";
import { mockWebsocket } from "../utils/mockWebsocket";

test.use({
  storageState: getBrowserState({ perfMode: true, webGL: true }),
});

const getMeasurements = async (page: playwright.Page) => {
  // To get all performance marks
  const getAllMeasuresJson = await page.evaluate(() =>
    JSON.stringify(window.performance.getEntriesByType("measure")),
  );
  const getAllMeasures = await JSON.parse(getAllMeasuresJson);

  const elapsedMs = getAllMeasures.filter(
    ({ name }) => name === "knime:ticker:elapsedMS",
  );
  const measurements = getAllMeasures.filter(
    ({ name }) => name !== "knime:ticker:elapsedMS",
  );

  const average = (array: number[]) =>
    array.reduce((a, b) => a + b) / array.length;

  const elapsedMsDurations = elapsedMs.map(({ duration }) => duration);
  const averageFrameMs = average(elapsedMsDurations);

  const slowestFrame = elapsedMs
    .toSorted(
      (a: { duration: number }, b: { duration: number }) =>
        a.duration > b.duration,
    )
    .at(0);

  const averageFps = 1000 / averageFrameMs;

  return {
    measurements,
    slowestFrame,
    averageFrameMs,
    averageFps,
  };
};

test("test performance with small workflow", async ({ page }) => {
  await mockWebsocket(page, "getWorkflow.json");
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const { measurements, slowestFrame, averageFps } = await getMeasurements(
    page,
  );

  expect(slowestFrame.duration).toBeLessThan(150);
  expect(averageFps).toBeGreaterThanOrEqual(50);

  console.log("measurements", measurements);
  console.log("slowest elapsedMs", slowestFrame);
  console.log("averageFps", averageFps.toFixed(2));
});

test("test performance with buildings workflow", async ({ page }) => {
  await mockWebsocket(page, "getWorkflow-buildings.json");
  await page.goto("/");

  await page.waitForSelector('body[data-first-render="done"]');

  const { measurements, slowestFrame, averageFps } = await getMeasurements(
    page,
  );

  expect(slowestFrame.duration).toBeLessThan(2000);
  expect(averageFps).toBeGreaterThanOrEqual(6);

  console.log("measurements", measurements);
  console.log("slowest elapsedMs", slowestFrame);
  console.log("averageFps", averageFps.toFixed(2));
});
