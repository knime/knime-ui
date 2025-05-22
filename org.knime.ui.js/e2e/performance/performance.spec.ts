/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */

import { type Page, expect, test } from "@playwright/test";

import { getKanvasBoundingBox, startApplication } from "../utils";

const getMeasurements = async (page: Page) => {
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

const startFpsMeasurement = async (page: Page) => {
  await page.evaluate(() => {
    const fpsMeasurement = (window.__PERF_FPS_MEASUREMENT__ = {
      start: performance.now(),
      frameCount: 0,
      countFrames: () => {
        fpsMeasurement.frameCount++;
      },
    });
    const app = window.__PIXI_APP__;
    app.ticker.add(fpsMeasurement.countFrames);
  });

  const stop = async () => {
    const averageFps = await page.evaluate(() => {
      const app = window.__PIXI_APP__;
      const fpsMeasurement = window.__PERF_FPS_MEASUREMENT__!;

      const endTime = performance.now();
      app.ticker.remove(fpsMeasurement.countFrames);
      const elapsedTime = (endTime - fpsMeasurement.start) / 1000;
      const averageFps = fpsMeasurement.frameCount / elapsedTime;
      return averageFps.toFixed(2);
    });

    return { averageFps };
  };

  return {
    stop,
  };
};

const testWorkflows = [
  {
    name: "nodes",
    file: "performance/nodes.json",
  },
  {
    name: "nodes with connections",
    file: "performance/nodesConnections.json",
  },
  {
    name: "annotations",
    file: "performance/annotations.json",
  },
  {
    name: "small workflow",
    file: "getWorkflow.json",
  },
  {
    name: "big workflow",
    file: "getWorkflow-buildings.json",
    expectedFps: 30,
  },
];

test.describe("rendering performance", () => {
  const doTest = async (
    page: Page,
    workflowFixturePath: string,
    expectedFps: number,
    expectedSlowestFrame: number,
  ) => {
    await startApplication(page, { workflowFixturePath });

    const { measurements, slowestFrame, averageFps } = await getMeasurements(
      page,
    );

    expect(averageFps).toBeGreaterThanOrEqual(expectedFps);
    expect(slowestFrame.duration).toBeLessThan(expectedSlowestFrame);

    console.log("averageFps", averageFps.toFixed(2));
    console.log("slowest elapsedMs", slowestFrame);
    console.log("measurements", measurements);
  };

  test("small workflow", async ({ page }) => {
    await doTest(page, "getWorkflow.json", 50, 150);
  });

  test("big workflow", async ({ page }) => {
    await doTest(page, "getWorkflow-buildings.json", 6, 2000);
  });
});

test.describe("pan performance", () => {
  const doTest = async (
    page: Page,
    workflowFixturePath: string,
    expectedFps = 50,
    zoom = false,
  ) => {
    await startApplication(page, { workflowFixturePath, waitForRender: false });
    const kanvasBox = await getKanvasBoundingBox(page);
    await page.mouse.move(
      kanvasBox!.x + kanvasBox!.width / 2 + 10,
      kanvasBox!.y + kanvasBox!.height / 2 + 20,
    );

    if (zoom) {
      // zoom in
      await page.keyboard.down("ControlOrMeta");
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -1);
      }
      await page.keyboard.up("ControlOrMeta");
    }

    // pan
    const { stop } = await startFpsMeasurement(page);
    const panIterations = 100;
    const panStepSize = 20;
    for (let i = 0; i < panIterations; i++) {
      await page.mouse.wheel(0, panStepSize * -1);
    }
    for (let i = 0; i < panIterations; i++) {
      await page.mouse.wheel(0, panStepSize);
    }
    for (let i = 0; i < panIterations; i++) {
      await page.mouse.wheel(panStepSize, 0);
    }
    for (let i = 0; i < panIterations; i++) {
      await page.mouse.wheel(panStepSize * -1, 0);
    }

    const { averageFps } = await stop();
    console.log("averageFps", averageFps);
    expect(Number(averageFps)).toBeGreaterThanOrEqual(expectedFps);
  };

  test.describe("fill entire screen", () => {
    testWorkflows.forEach(({ name, file, expectedFps }) => {
      test(name, async ({ page }) => {
        await doTest(page, file, expectedFps);
      });
    });
  });

  test.describe("zoomed in", () => {
    testWorkflows.forEach(({ name, file, expectedFps }) => {
      test(name, async ({ page }) => {
        await doTest(page, file, expectedFps, true);
      });
    });
  });
});

test.describe("zoom performance", () => {
  const doTest = async (
    page: Page,
    workflowFixturePath: string,
    expectedFps = 50,
  ) => {
    await startApplication(page, { workflowFixturePath, waitForRender: false });
    const kanvasBox = await getKanvasBoundingBox(page);
    await page.mouse.move(
      kanvasBox!.x + kanvasBox!.width / 2 + 10,
      kanvasBox!.y + kanvasBox!.height / 2 + 20,
    );

    const { stop } = await startFpsMeasurement(page);

    await page.keyboard.down("ControlOrMeta");
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -1);
    }
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 1);
    }
    await page.keyboard.up("ControlOrMeta");

    const { averageFps } = await stop();
    console.log("averageFps", averageFps);
    expect(Number(averageFps)).toBeGreaterThanOrEqual(expectedFps);
  };

  testWorkflows.forEach(({ name, file, expectedFps }) => {
    test(name, async ({ page }) => {
      await doTest(page, file, expectedFps);
    });
  });
});

test.describe.skip("open/close metanode", () => {
  // TODO add test for opening metanode
});

test.describe.skip("drag node", () => {
  // TODO add test for dragging a node
});

test.describe.skip("drag annotation", () => {
  // TODO add test for dragging annotation
});
