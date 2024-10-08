import { merge } from "lodash-es";

import {
  Annotation,
  type NodeAnnotation,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { annotationColorPresets } from "@/style/colors";
import type { DeepPartial } from "../utils";

import { createBounds } from "./common";

const createAnnotation = (data: DeepPartial<Annotation> = {}): Annotation => {
  return merge(
    {
      textAlign: Annotation.TextAlignEnum.Right,
      backgroundColor: "#fff",
      text: {
        value: "Lorem ipsum dolor sit amet",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      styleRanges: [{ start: 0, length: 2, fontSize: 14 }],
    },
    data,
  );
};

export const createNodeAnnotation = (
  data: Partial<NodeAnnotation> = {},
): NodeAnnotation => {
  return createAnnotation(data);
};

export const createWorkflowAnnotation = (
  data: DeepPartial<WorkflowAnnotation> = {},
): WorkflowAnnotation => {
  const baseAnnotation = createAnnotation(data);

  return merge(
    {
      ...baseAnnotation,

      id: "id1",
      borderWidth: 4,
      borderColor: annotationColorPresets.SilverSand,
      bounds: createBounds({ x: 0, y: 0, width: 100, height: 50 }),
    },
    data,
  );
};
