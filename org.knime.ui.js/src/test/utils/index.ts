import type { MockedObject } from "vitest";

export * from "./create-deep-mock";
export * from "./withPorts";
export * from "./withoutKeys";
export * from "./mockTimingFunctions";
export * from "./types";
export * from "./mockBoundingRect";

export const mockedObject = <T>(param: T) => param as MockedObject<T>;
