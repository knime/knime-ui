import type { App } from "vue";

declare global {
  const VUE_APP: App<Element>;

  interface Window {
    VUE_APP: App<Element>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Vue: any;
  }
}
