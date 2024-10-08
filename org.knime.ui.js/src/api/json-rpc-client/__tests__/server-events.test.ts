import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { registerEventHandler, serverEventHandler } from "../server-events";

const origErrorLogger = consola.error;

describe("server-events", () => {
  let eventHandlers: Record<string, () => any>;

  beforeEach(() => {
    eventHandlers = {
      WorkingEvent: vi.fn(),
      CompositeEvent: vi.fn(),
      ErrorEvent: vi.fn().mockImplementation(() => {
        throw new Error("boo!");
      }),
      NotFunction: null,
    };
    Object.entries(eventHandlers).forEach(([eventName, eventHandler]) => {
      registerEventHandler(eventName, eventHandler);
    });
  });

  it("calls event handler successfully", () => {
    serverEventHandler('{"eventType":"WorkingEvent","payload":"foo"}');
    expect(eventHandlers.WorkingEvent).toHaveBeenCalledWith("foo");
  });

  it("verifies and calls composite event successfully", () => {
    serverEventHandler(
      '{"eventType":"WorkingEvent:WorkingEvent","payload":{"events":[null,null]}}',
    );
    expect(eventHandlers.CompositeEvent).toHaveBeenCalledWith({
      eventHandlers: expect.anything(),
      events: ["WorkingEvent", "WorkingEvent"],
      params: [null, null],
    });
  });

  it("fails and does not call composite event if one event does not exist", () => {
    const rawServerEvent =
      '{"eventType":"WorkingEvent:NotWorkingEvent","payload":{"events":[null,null]}}';
    expect(() => {
      serverEventHandler(rawServerEvent);
    }).toThrow();
    expect(eventHandlers.CompositeEvent).not.toHaveBeenCalled();
  });

  describe("error handling", () => {
    beforeAll(() => {
      consola.error = vi.fn();
    });

    afterAll(() => {
      consola.error = origErrorLogger;
    });

    it("throws an error for invalid arguments", () => {
      // @ts-expect-error
      const call1 = () => serverEventHandler(1);
      expect(call1).toThrow(expect.any(TypeError));
    });

    it("fails for syntactically invalid JSON", () => {
      expect(() => {
        serverEventHandler('{"foo":"bar"""}');
      }).toThrow();
    });

    it("returns an error for non-existing methods", () => {
      expect(() => {
        serverEventHandler(
          '{"jsonrpc":"2.0","eventType":"invalidAction","params":["foo"]}',
        );
      }).toThrow();
    });

    it("returns an error for non-function handlers", () => {
      expect(() => {
        serverEventHandler(
          '{"jsonrpc":"2.0","eventType":"NotFunction","params":["foo"]}',
        );
      }).toThrow();
    });
  });
});
