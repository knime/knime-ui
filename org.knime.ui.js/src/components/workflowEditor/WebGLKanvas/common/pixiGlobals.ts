import { Application, Container } from "pixi.js";

let applicationInstance: Application | null;

const hasApplicationInstance = () => Boolean(applicationInstance);

const setApplicationInstance = (value: Application) => {
  applicationInstance = value;
};

const getApplicationInstance = () => {
  if (!applicationInstance) {
    throw new Error("Application instance not set");
  }

  return applicationInstance;
};

let mainContainer: Container | null;

const hasMainContainer = () => Boolean(mainContainer);

const setMainContainer = (value: Container) => {
  mainContainer = value;
};

const getMainContainer = () => {
  if (!mainContainer) {
    throw new Error("MainContainer instance not set");
  }

  return mainContainer;
};

const getCanvas = () => {
  if (!applicationInstance) {
    throw new Error("Application instance not found");
  }

  return applicationInstance.canvas;
};

const clear = () => {
  applicationInstance = null;
  mainContainer = null;
};

export const pixiGlobals = {
  hasApplicationInstance,
  setApplicationInstance,
  getApplicationInstance,
  hasMainContainer,
  setMainContainer,
  getMainContainer,
  getCanvas,
  clear,
};
