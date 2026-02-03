import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { embeddingSDK } from "@knime/hub-features";

import { waitForEmbeddingContext } from "../waitForEmbeddingContext";

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    embeddingSDK: {
      guest: {
        waitForContext: vi.fn(() =>
          Promise.resolve({
            wsConnectionUri: "real-value",
            restApiBaseUrl: "real-value",
          }),
        ),
        setContext: vi.fn(),
      },
    },
  };
});

describe("waitForEmbeddingContext", () => {
  beforeAll(() => {
    // @ts-expect-error
    import.meta.env.VITE_BROWSER_DEV_WS_URL = "ws://local.ws";
    // @ts-expect-error
    import.meta.env.VITE_BROWSER_DEV_HTTP_URL = "http://local.http";
  });

  beforeEach(() => {
    // ensure same state
    import.meta.env.PROD = false;
    import.meta.env.DEV = false;
    import.meta.env.mode = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("works for PROD", async () => {
    import.meta.env.PROD = true;
    const { wsConnectionUri, restApiBaseUrl } = await waitForEmbeddingContext();
    expect(embeddingSDK.guest.waitForContext).toHaveBeenCalled();
    expect(wsConnectionUri).toBe("real-value");
    expect(restApiBaseUrl).toBe("real-value");
  });

  it("works for e2e", async () => {
    import.meta.env.mode = "e2e";

    const { wsConnectionUri, restApiBaseUrl } = await waitForEmbeddingContext();
    expect(embeddingSDK.guest.waitForContext).not.toHaveBeenCalled();
    expect(wsConnectionUri).toBe("ws://local.ws");
    expect(restApiBaseUrl).toBe("http://local.http");
  });

  it("works for DEV", async () => {
    import.meta.env.DEV = true;

    const { wsConnectionUri, restApiBaseUrl } = await waitForEmbeddingContext();
    expect(embeddingSDK.guest.waitForContext).not.toHaveBeenCalled();
    expect(wsConnectionUri).toBe("ws://local.ws");
    expect(restApiBaseUrl).toBe("http://local.http");
  });

  it("works for DEV (embedded mode)", async () => {
    import.meta.env.DEV = true;
    // @ts-expect-error
    import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED = "true";

    const { wsConnectionUri, restApiBaseUrl } = await waitForEmbeddingContext();
    expect(embeddingSDK.guest.waitForContext).toHaveBeenCalled();
    expect(wsConnectionUri).toBe("ws://local.ws");
    expect(restApiBaseUrl).toBe("real-value");
  });
});
