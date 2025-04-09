import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { UI_SCALE_STEPSIZE, ratioToZoomLevel } from "@/store/settings";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

describe("settings store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increases ui scale", async () => {
    const { settingsStore } = mockStores();

    await settingsStore.increaseUiScale();
    expect(settingsStore.settings.uiScale).toBe(1.0 + UI_SCALE_STEPSIZE);
    await settingsStore.increaseUiScale();
    expect(settingsStore.settings.uiScale).toBe(1.0 + 2 * UI_SCALE_STEPSIZE);

    expect(mockedAPI.desktop.setZoomLevel).toBeCalledTimes(2);
  });

  it("decreases ui scale", async () => {
    const { settingsStore } = mockStores();

    await settingsStore.decreaseUiScale();
    expect(settingsStore.settings.uiScale).toBe(1.0 - UI_SCALE_STEPSIZE);
    await settingsStore.decreaseUiScale();
    expect(settingsStore.settings.uiScale).toBe(1.0 - 2 * UI_SCALE_STEPSIZE);

    expect(mockedAPI.desktop.setZoomLevel).toBeCalledTimes(2);
  });

  it("resets ui scale", async () => {
    const { settingsStore } = mockStores();

    settingsStore.settings.uiScale = 2.331;
    await settingsStore.resetUiScale();
    expect(settingsStore.settings.uiScale).toBe(1.0);

    expect(mockedAPI.desktop.setZoomLevel).toBeCalledTimes(1);
  });

  it("helper converts between scale ratio and browser zoom level", () => {
    // the listed cases are also tested with inverse ratio / negative zoom
    const conversionCases = [
      [1.0, 0.0],
      [1.2, 1.0],
      [1.44, 2.0],
      [1.728, 3.0],
      [2.0736, 4.0],

      [1.25, 1.2239],
      [1.5, 2.2239],
      [2.0, 3.80178],
      [2.5, 5.02568],
    ];

    conversionCases.forEach(([ratio, level]) => {
      expect(ratioToZoomLevel(ratio)).toBeCloseTo(level);
      expect(ratioToZoomLevel(1.0 / ratio)).toBeCloseTo(-level);
    });
  });
});
