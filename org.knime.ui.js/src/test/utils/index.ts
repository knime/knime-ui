import type { MockedObject } from "vitest";

export * from "./mockVuexStore";
export * from "./create-deep-mock";
export * from "./withPorts";
export * from "./withoutKeys";
export * from "./mockLodash";
export * from "./types";
export * from "./mockBoundingRect";
export * from "./mockDynamicImport";

export const mockedObject = <T>(param: T) => param as MockedObject<T>;
