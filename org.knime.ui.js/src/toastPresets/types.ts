export type ToastPresetHandler<T = []> = (...args: T[]) => void;

type WithOptionalError<T> = T extends { error?: unknown }
  ? T
  : { error: unknown } & T;

export type ToastPresetErrorHandler<T = unknown> = ToastPresetHandler<
  WithOptionalError<T>
>;
