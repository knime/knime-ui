import { gateway } from "./gateway-api";
import { desktop } from "./desktop-api";
import { init } from "./webswing-api";

const { rpcClient, ...apiMethods } = gateway;
const webswing = init(rpcClient);

export const API = {
  ...apiMethods,
  desktop,
  webswing,
};
