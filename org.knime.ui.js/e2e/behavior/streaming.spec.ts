import { expect, test } from "@playwright/test";

import { getKanvasBoundingBox, startApplication } from "../utils";

/* Testing the streaming connectors and labels. The challenge here is that the
   connections and the node progress are continuously animated, so in order to
   create reliable screenshots we need to stop the Pixi ticker after a fixed amount of time
   to halt all animations. Due to the nature of the ticker all animations should progress
   the same amount given the same amount of time.
*/

test.describe.skip("streaming connectors and labels", () => {
  test.afterEach(async ({ page }) => {
    // Ensure the ticker is started again after each test
    await page.evaluate(async () => {
      const ticker = globalThis.__PIXI_APP__.ticker;
      if (ticker) {
        await ticker.start();
      }
    });
  });

  test("render", async ({ page }) => {
    await startApplication(page, {
      workflowFixturePath: "streaming/streamingComponent.json",
      waitForRender: true,
    });
    const kanvasBox = await getKanvasBoundingBox(page);

    // Wait for 2 seconds, animations should execute the same amount regardles of frame rate
    await page.waitForTimeout(2000); // eslint-disable-line no-magic-numbers

    // Stop the Pixi ticker to halt all animations
    await page.evaluate(async () => {
      const ticker = globalThis.__PIXI_APP__.ticker;
      if (ticker) {
        await ticker.stop();
      } else {
        throw new Error("Ticker not found");
      }
    });

    /* Compare screenshots. Although the animations are stopped, the node progress 
       and connectors could still minimally differ due to small animation offsets and 
       timings, so we allow for a very small difference 
    */
    await expect(page).toHaveScreenshot({
      clip: kanvasBox!,
      maxDiffPixels: 10,
    });
  });
});
