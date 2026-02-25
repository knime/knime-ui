/* eslint-disable class-methods-use-this */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";

import { $bus } from "@/plugins/event-bus";
import { getToastPresets } from "@/services/toastPresets";
import { serverEventHandler } from "../../events/server-events";
import { initBrowserRPCClient } from "../index";

vi.mock("@/plugins/event-bus", () => ({
  $bus: {
    emit: vi.fn(),
  },
}));

vi.mock("../../events/server-events", () => ({
  getRegisteredEventHandler: () => {},
  registerEventHandler: () => {},
  serverEventHandler: vi.fn(),
}));

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
  beforeEach(() => {
    vi.resetModules();
  });

  describe("desktop", () => {
    it("should check for the EquoComm service", async () => {
      const { initDesktopRPCClient } = await import("../index");

      // @ts-expect-error We need 'undefined' to be allowed here
      window.EquoCommService = undefined;

      expect(() => {
        return initDesktopRPCClient();
      }).toThrow("Could not access EquoComm service. Aborting");
    });

    it("should attach server event handlers", async () => {
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

      const { initDesktopRPCClient, getRPCClientInstance } = await import(
        "../index"
      );

      initDesktopRPCClient();

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
    it("should check for browser session context", async () => {
      const { initBrowserRPCClient } = await import("../index");

      expect(() => {
        return initBrowserRPCClient(null as any);
      }).toThrow("Missing browser session context");
    });

    it("should attach listeners for connection loss", async () => {
      const spy = vi.spyOn(window, "addEventListener");
      const busEmitSpy = vi.spyOn($bus, "emit");

      const { toastPresets } = getToastPresets();
      const connectionLossToastSpy = vi.spyOn(
        toastPresets.connectivity,
        "connectionLoss",
      );
      const connectionRestoredToastSpy = vi.spyOn(
        toastPresets.connectivity,
        "connectionRestored",
      );

      initBrowserRPCClient({
        url: "wss://localhost:1000",
        restApiBaseUrl: "",
        userIdleTimeout: 1000,
        jobId: "",
        wsConnectionUri: "",
      });

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

      expect(connectionLossToastSpy).toHaveBeenCalled();

      await flushPromises();
      await nextTick();
      await new Promise((r) => setTimeout(r, 0));

      expect(busEmitSpy).toHaveBeenCalledWith("block-ui");

      window.dispatchEvent(new Event("online"));

      expect(connectionRestoredToastSpy).toHaveBeenCalled();

      expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");
    });
  });
});
