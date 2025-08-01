export type ToastPresetHandler<T = []> = (...args: T[]) => void;

export type ToastPresetErrorHandler<T = unknown> = ToastPresetHandler<
  T & { error: unknown }
>;
