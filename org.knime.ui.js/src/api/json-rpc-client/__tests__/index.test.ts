/* eslint-disable class-methods-use-this */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { mockVuexStore, mockedObject } from "@/test/utils";
import { serverEventHandler } from "../server-events";
import { getToastsProvider } from "@/plugins/toasts";

vi.mock("../server-events", () => ({
  getRegisteredEventHandler: () => {},
  registerEventHandler: () => {},
  serverEventHandler: vi.fn(),
}));

const toast = mockedObject(getToastsProvider());

const addEventListener = vi.fn();

vi.mock("@open-rpc/client-js", async () => {
  const actual = await vi.importActual("@open-rpc/client-js");

  class WebSocketTransport {
    connection = {
      addEventListener,
      removeEventListener: vi.fn(),
    };

    // eslint-disable-next-line no-empty-function
    subscribe() {}
    // eslint-disable-next-line no-empty-function
    connect() {}
  }

  return { ...actual, WebSocketTransport };
});

describe("rpc client initialization", () => {
  const updateGlobalLoader = vi.fn();
  const store = mockVuexStore({
    application: {
      actions: {
        updateGlobalLoader,
      },
    },
  });

  beforeEach(() => {
    vi.resetModules();
  });

  describe("desktop", () => {
    it("should check for the EquoComm service", async () => {
      const { initJSONRPCClient } = await import("../index");

      // @ts-ignore: We need 'undefined' to be allowed here
      window.EquoCommService = undefined;

      expect(() => {
        return initJSONRPCClient(
          "DESKTOP",
          { url: "", jobId: "", restApiBaseUrl: "", sessionId: "" },
          store,
        );
      }).rejects.toThrow("Could not access EquoComm service. Aborting");
    });

    it("should attach server event handlers", async () => {
      const { initJSONRPCClient, getRPCClientInstance } = await import(
        "../index"
      );
      const callbacks: Array<(...args: any[]) => any> = [];
      const JAVA_EVENT_ACTION_ID = "org.knime.ui.java.event";

      const EquoCommService = {
        on: vi.fn((_id, cb) => {
          callbacks.push(cb);
        }),

        dispatch: (event: any) => {
          callbacks.forEach((cb) => cb(event));
        },
      };

      // @ts-expect-error
      window.EquoCommService = EquoCommService;

      await initJSONRPCClient(
        "DESKTOP",
        { url: "", jobId: "", restApiBaseUrl: "", sessionId: "" },
        store,
      );

      expect(EquoCommService.on).toHaveBeenCalledWith(
        JAVA_EVENT_ACTION_ID,
        expect.any(Function),
        expect.any(Function),
      );

      EquoCommService.dispatch({ mock: "event" });

      expect(serverEventHandler).toHaveBeenCalledWith({ mock: "event" });
      expect(getRPCClientInstance()).toBeDefined();
    });
  });

  describe("browser", () => {
    it("should check for connection info", async () => {
      const { initJSONRPCClient } = await import("../index");
      expect(() => {
        return initJSONRPCClient("BROWSER", null, store);
      }).rejects.toThrow("Missing connection info");
    });

    it("should attach listeners for connection loss", async () => {
      const spy = vi.spyOn(window, "addEventListener");
      const { initJSONRPCClient } = await import("../index");

      await initJSONRPCClient(
        "BROWSER",
        {
          url: "wss://localhost:1000",
          jobId: "",
          restApiBaseUrl: "",
          sessionId: "",
        },
        store,
      );

      expect(addEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );

      expect(addEventListener).toHaveBeenCalledWith(
        "close",
        expect.any(Function),
      );

      expect(spy).toHaveBeenCalledWith("online", expect.any(Function));
      expect(spy).toHaveBeenCalledWith("offline", expect.any(Function));

      window.dispatchEvent(new Event("offline"));

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Please, check your internet connection and try refreshing the page",
        }),
      );

      expect(updateGlobalLoader).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ loading: true }),
      );

      window.dispatchEvent(new Event("online"));

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Connection restored",
        }),
      );
    });
  });
});
