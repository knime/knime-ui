import { gateway } from "./gateway-api";
import { desktop } from "./desktop-api";

export const API = {
  ...gateway,
  desktop,
};
