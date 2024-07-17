import { createStore } from "vuex";

const mockVuexStore = <T = any>(moduleInput: Record<any, any>) => {
  const modules = Object.entries(moduleInput).reduce(
    (modules, [moduleName, moduleConfig]) => {
      if (moduleName !== "index") {
        // @ts-ignore
        modules[moduleName] = { ...moduleConfig, namespaced: true };
      }
      return modules;
    },
    {},
  );

  const storeConfig = { modules };

  if (moduleInput.index) {
    Object.assign(storeConfig, moduleInput.index);
  }

  // @ts-ignore
  if (typeof storeConfig.state === "object") {
    // @ts-ignore
    storeConfig.state = () => storeConfig.state;
  }

  return createStore<T>(storeConfig);
};

export { mockVuexStore };
