/* eslint-disable no-undefined */
import path from "node:path";

import dotenvx from "@dotenvx/dotenvx";
import { defineConfig, devices } from "@playwright/test";

import { getBrowserStorageState } from "./e2e/utils";

// use e2e env file
const envFilePath = path.resolve(import.meta.dirname, ".env.e2e");
dotenvx.config({ path: envFilePath });

const WEBSERVER_HOST = "127.0.0.1";
const WEBSERVER_PORT = process.env.VITE_APP_PORT;
const WEBSERVER_URL = `http://${WEBSERVER_HOST}:${WEBSERVER_PORT}`;

process.env.PLAYWRIGHT_WEBSERVER_URL = WEBSERVER_URL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",

  timeout: process.env.CI ? 1000 * 60 * 5 : undefined,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: WEBSERVER_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    testIdAttribute: "data-test-id",
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // this enables the new headlessy mode (its more like a real browser)
        channel: "chromium",
        // custom
        viewport: {
          width: 1920,
          height: 1040,
        },
        deviceScaleFactor: 2,
        storageState: getBrowserStorageState(),
        launchOptions: {
          // allow the use of software based webgl rendering
          args: ["--enable-unsafe-swiftshader"],
        },
      },
    },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `echo "Starting application at: http://${WEBSERVER_HOST}:${WEBSERVER_PORT}" && pnpm build:e2e && pnpm serve --host=${WEBSERVER_HOST} --port=${WEBSERVER_PORT}`,
    url: WEBSERVER_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    // Add more time, because in CI the vite build for the application might take longer
    timeout: 240000,
  },
});
