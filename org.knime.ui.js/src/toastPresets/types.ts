export type ToastPresetHandler<T = []> = (...args: T[]) => void;

export type ToastPresetErrorHandler<T = any> = ToastPresetHandler<
  T & { error: unknown }
>;
