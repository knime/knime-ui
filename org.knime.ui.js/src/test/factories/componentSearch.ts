import { merge } from "lodash-es";

import { ComponentSearchItem } from "@/api/gateway-api/generated-api";
import type { DeepPartial } from "../utils";

import { PORT_TYPE_IDS } from "./common";

export const createComponentSearchItem = (
  data: DeepPartial<ComponentSearchItem>,
) => {
  return merge(
    {
      type: ComponentSearchItem.TypeEnum.Manipulator,
      description: "This is the component description",
      name: "Awesome component",
      inPorts: [
        {
          name: PORT_TYPE_IDS.BufferedDataTable,
          color: "#000",
          description: "This is the first port",
          optional: false,
          portTypeName: "table",
        },
      ],
      outPorts: [],
    } satisfies ComponentSearchItem,
    data,
  );
};
