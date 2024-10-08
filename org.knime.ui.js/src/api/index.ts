import { desktop } from "./desktop-api";
import { gateway } from "./gateway-api";

export const API = {
  ...gateway,
  desktop,
};
