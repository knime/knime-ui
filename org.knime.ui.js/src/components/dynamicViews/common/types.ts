export type ViewStateChangeEvent = {
  state: "loading" | "ready" | "error";
  message?: string;
  portKey: string;
};
