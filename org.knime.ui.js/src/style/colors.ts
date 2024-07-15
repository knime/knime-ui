/* eslint-disable import/extensions */
import * as knimeColors from "@knime/styles/colors/knimeColors";
import * as nodeColors from "@knime/styles/colors/nodeColors";
import * as portColorsCommon from "@knime/styles/colors/portColors";

const applyAlphaHSL = (hsl: string, alpha: string) =>
  `${hsl.slice(0, -1)}, ${alpha})`;

export const text = {
  default: knimeColors.Masala,
};

export const portColors = {
  ...portColorsCommon,
  generic: "hsl(0, 0%, 61%)",
  inactive: "hsl(0, 100%, 50%)", // "×"
  inactiveOutline: "hsla(0, 100%, 100%, 66%)", // outline around "×"
};

export const nodeBackgroundColors = nodeColors;

export const linkDecorator = knimeColors.Black;

export const selection = {
  hoverBackground: applyAlphaHSL(knimeColors.Porcelain, "90%"),
  // goal: 9% of Cornflower on white background at 10% opacity
  // step 1: apply 9.9% opacity to Cornflower
  // step 2: add 10% transparency to the resulting color
  // results in the same brightness as hoverBackground
  activeBackground: "rgba(233, 241, 246, 90%)",
  activeBorder: knimeColors.Cornflower,
};

export const connectorColors = {
  default: knimeColors.SilverSand,
  flowVariable: portColors.flowVariable,
};

export const trafficLight = {
  red: "hsl(339.1, 88.4%, 43.9%)",
  yellow: knimeColors.Yellow,
  green: "hsl(127.5, 50%, 47.1%)",
  blue: "hsl(206, 69.7%, 55.9%)",
  inactive: "hsl(0, 0%, 100%)",
  inactiveBorder: "hsl(0, 0%, 48.2%)",
  background: "hsl(192, 6.8%, 85.7%)",
};

export const darkeningMask = "hsla(0, 0%, 0%, 33.3%)";

export const nodeProgressBar = knimeColors.Cornflower;
export const metanodeState = knimeColors.Masala;

export const error = trafficLight.red;
export const warning = knimeColors.Yellow;

export const notifications = {
  info: "hsla(206, 42%, 86%, 90%)",
  warning: "rgba(255 216 0 / 20%)",
};

export const annotationColorPresets = {
  None: "#FFFFFF",
  SilverSand: "#C0C4C6",
  DoveGray: "#6E6E6E",
  AquamarineDark: "#2B94B1",
  CornflowerDark: "#1A417A",
  Yellow: "#FFD800",
  Carrot: "#FF9632",
  Coral: "#FF4B4B",
  MeadowLight: "#C8E632",
  Meadow: "#3CB44B",
  Avocado: "#CBD9A9",
  Petrol: "#469990",
  PetrolDark: "#005559",
  Wood: "#D2A384",
  WoodDark: "#77563C",
};

export const defaultAnnotationBorderColor = annotationColorPresets.SilverSand;

export * from "@knime/styles/colors/knimeColors";
