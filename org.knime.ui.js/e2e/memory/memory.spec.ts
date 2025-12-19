/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */

import { type Page, expect, test } from "@playwright/test";

import { getNodePosition, startApplication } from "../utils";

const measureMemoryUsage = async (page: Page) => {
  const { bytes, breakdown } = (await page.evaluate(async () => {
    // @ts-expect-error not baseline yet see:
    // https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory#browser_compatibility
    const result = await performance.measureUserAgentSpecificMemory();
    return result;
  })) as {
    bytes: number;
    breakdown: [
      {
        attribution: [
          {
            scope: string;
            url: string;
          },
        ];
        bytes: number;
        types: Array<"JavaScript" | "Canvas" | "Shared" | "DOM">;
      },
    ];
  };

  const jsHeap = breakdown.reduce((sum, item) => {
    return item.types?.includes("JavaScript") ? sum + (item.bytes || 0) : sum;
  }, 0);

  return { bytes, jsHeap, breakdown };
};

const formatAsMb = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(2);
};

const mbToByte = (mb: number) => mb * 1024 * 1024;

const start = (page: Page) =>
  startApplication(page, {
    componentDescriptionFixturePath: "memory/component-desc.json",
    workflowFixturePath: {
      root: "memory/data-app-workflow.json",
      "root:3326": "memory/data-app-component.json",
    },
  });

test("render memory test workflow", async ({ page }) => {
  await start(page);
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const memory = await measureMemoryUsage(page);
  expect(memory.bytes < mbToByte(300)).toBe(true);
});

const goToComponentAndBackTimes = 15;
const maxIncreaseTimes = 1;

test(`open component and return to main ${goToComponentAndBackTimes} times`, async ({
  page,
}) => {
  test.setTimeout(120_000);

  await start(page);
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const startBytes = (await measureMemoryUsage(page)).jsHeap;

  console.log(`start ${formatAsMb(startBytes)} MB`);
  expect(startBytes < mbToByte(300)).toBe(true);

  for (let i = 0; i < goToComponentAndBackTimes; i++) {
    console.log(`open component and back iteration ${i + 1}`);
    // enter component
    const pos = await getNodePosition(page, "root:3326");

    await page.keyboard.down("ControlOrMeta");
    await page.mouse.dblclick(...pos);
    await page.keyboard.up("ControlOrMeta");

    await page.waitForTimeout(500);

    // leave it
    await page
      .locator(".breadcrumb span[role='button']")
      .first()
      .click({ timeout: 2000 });

    await page.waitForTimeout(500);
  }

  // let gc work
  await page.requestGC();
  await page.waitForTimeout(500);

  const endMem = await measureMemoryUsage(page);
  const endBytes = endMem.jsHeap;
  console.log(
    `end ${formatAsMb(endBytes)} MB - increase by ${Math.round(
      (endBytes / startBytes) * 100 - 100,
    )}% for ${goToComponentAndBackTimes} iterations [allowed: ${
      maxIncreaseTimes * 100
    }%]`,
  );

  expect(endBytes < startBytes * (1 + maxIncreaseTimes)).toBe(true);
});
