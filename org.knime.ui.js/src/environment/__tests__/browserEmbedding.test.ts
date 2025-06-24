import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import {
  browserEmbedding,
  clearBrowserSessionContext,
} from "../browserEmbedding";

describe("browserEmbedding", () => {
  beforeAll(() => {
    import.meta.env.DEV = false;
  });

  afterEach(() => {
    clearBrowserSessionContext();
    vi.clearAllMocks();
  });

  const createWindowMessage = (data: any) =>
    new MessageEvent("message", { data });

  const postMessage = vi.spyOn(window.parent, "postMessage");

  describe("waitForContext", () => {
    it("waits for the correct message", async () => {
      const done = vi.fn();
      browserEmbedding.waitForContext().then(done);

      await flushPromises();
      expect(done).not.toHaveBeenCalled();

      // send bogus message
      window.dispatchEvent(createWindowMessage("foo"));
      await flushPromises();
      expect(done).not.toHaveBeenCalled();

      window.dispatchEvent(
        createWindowMessage({
          type: "KNIME_UI__CONNECTION_INFO",
          payload: {
            url: "ws://foo.com",
            restApiBaseUrl: "/api",
            userIdleTimeout: 1000,
          },
        }),
      );

      await flushPromises();
      expect(done).toHaveBeenCalledExactlyOnceWith({
        url: "ws://foo.com",
        restApiBaseUrl: "/api",
        userIdleTimeout: 1000,
      });
    });

    it("validates that the message has a url", async () => {
      await expect(() => {
        const promise = browserEmbedding.waitForContext();

        window.dispatchEvent(
          createWindowMessage({
            type: "KNIME_UI__CONNECTION_INFO",
            payload: {},
          }),
        );

        return promise;
      }).rejects.toThrowError(
        new Error("incorrect BrowserSessionContext payload. URL missing"),
      );
    });

    it("sends message to notify that waiting is ready", () => {
      browserEmbedding.waitForContext();
      expect(postMessage).toHaveBeenCalledExactlyOnceWith(
        { type: "KNIME_UI__AWAITING_CONNECTION_INFO" },
        "*",
      );
    });
  });

  it("notifies user activity", () => {
    const payload = { idle: true, lastActive: new Date().toISOString() };

    browserEmbedding.notifyActivityChange(payload);
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { type: "KNIME_UI__USER_ACTIVITY", payload },
      "*",
    );
  });

  it("sends initialization errors", () => {
    const error = new Error("boom!");
    browserEmbedding.sendAppInitializationError(error);

    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { type: "KNIME_UI__CONNECTION_FAIL", error },
      "*",
    );
  });

  it("can get the current browser session context", async () => {
    browserEmbedding.waitForContext();

    expect(browserEmbedding.getBrowserSessionContext()).toBeUndefined();

    window.dispatchEvent(
      createWindowMessage({
        type: "KNIME_UI__CONNECTION_INFO",
        payload: {
          url: "ws://foo.com",
          restApiBaseUrl: "/api",
          userIdleTimeout: 1000,
        },
      }),
    );

    await flushPromises();
    expect(browserEmbedding.getBrowserSessionContext()).toEqual({
      url: "ws://foo.com",
      restApiBaseUrl: "/api",
      userIdleTimeout: 1000,
    });
  });
});
