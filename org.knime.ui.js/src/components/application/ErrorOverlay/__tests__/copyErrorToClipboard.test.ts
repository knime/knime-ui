import {
  type Mock,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { version } from "vue";

import { copyErrorToClipboard } from "../copyErrorToClipboard";

describe("copyErrorToClipboard", () => {
  const mockDate = new Date();
  Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("writes to clipboard", async () => {
    const testData = { test1: "testprop1", test2: { nested: "nestedprop" } };
    await copyErrorToClipboard(testData);

    const writeTextMock = navigator.clipboard.writeText as Mock;
    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(JSON.parse(writeTextMock.mock.lastCall?.[0])).toStrictEqual({
      app: "KnimeUI",
      vueVersion: version,
      timestamp: mockDate.toISOString(),
      ...testData,
    });
  });

  it("serializes error objects", async () => {
    const testError = new Error("mock error") as Error & { data: object };
    testError.data = { testdataProp: "mocked" };
    const testData = { test1: testError };
    await copyErrorToClipboard(testData);

    const writeTextMock = navigator.clipboard.writeText as Mock;
    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(JSON.parse(writeTextMock.mock.lastCall?.[0])).toStrictEqual({
      app: "KnimeUI",
      vueVersion: version,
      timestamp: mockDate.toISOString(),
      test1: {
        data: testError.data,
        message: "mock error",
        stack: expect.any(String),
      },
    });
  });
});
