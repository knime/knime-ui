import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import {
  Annotation,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createWorkflowAnnotation } from "@/test/factories";
import LegacyAnnotation from "../LegacyAnnotation.vue";

describe("LegacyAnnotation.vue", () => {
  const defaultProps = {
    annotation: createWorkflowAnnotation({ text: { value: "" } }),
  };

  const doMount = ({ props = {}, mocks = {} } = {}) => {
    const wrapper = mount(LegacyAnnotation, {
      props: { ...defaultProps, ...props },
      global: { mocks: { $shapes, ...mocks } },
    });

    return { wrapper };
  };

  it("renders empty text", () => {
    const { wrapper } = doMount();
    expect(wrapper.findAll("span").length).toBe(0);
  });

  it("renders text", () => {
    const { wrapper } = doMount({
      props: {
        annotation: {
          text: {
            value: "foo👻barbazqu👮🏻‍♂️xあなたは素晴らしい人です",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          styleRanges: [
            { start: 1, length: 2, bold: true, color: "red" },
            { start: 8, length: 1, italic: true, bold: true },
            { start: 10, length: 1, italic: true, bold: true, fontSize: 13 },
          ],
        },
      },
    });

    const spans = wrapper.findAll("span");
    expect(spans.length).toBe(7);

    expect(spans[0].text()).toBe("f");
    expect(spans[0].text()).toBe("f");
    expect(spans[1].text()).toBe("oo");
    expect(spans[2].text()).toBe("👻bar");
    expect(spans[3].text()).toBe("b");
    expect(spans[4].text()).toBe("a");
    expect(spans[5].text()).toBe("z");
    expect(spans[6].text()).toBe("qu👮🏻‍♂️xあなたは素晴らしい人です");

    expect(spans[0].attributes().style).toBeUndefined();
    expect(spans[1].attributes().style).toBe("color: red; font-weight: bold;");
    expect(spans[2].attributes().style).toBeUndefined();
    expect(spans[3].attributes().style).toBe(
      "font-weight: bold; font-style: italic;",
    );
    expect(spans[4].attributes().style).toBeUndefined();
    expect(spans[5].attributes().style).toBe(
      "font-size: 17.3329px; font-weight: bold; font-style: italic;",
    );
    expect(spans[6].attributes().style).toBeUndefined();
  });

  it("should apply styles to legacy annotation", () => {
    const annotation: Partial<WorkflowAnnotation> = {
      id: "id1",
      textAlign: Annotation.TextAlignEnum.Right,
      borderWidth: 4,
      borderColor: "#000",
      backgroundColor: "#000",
      text: {
        value: "lorem ipsum",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      styleRanges: [{ start: 0, length: 2, fontSize: 14 }],
    };

    const { wrapper } = doMount({
      props: { annotation },
    });

    const legacyAnnotationStyles = wrapper
      .findComponent(LegacyAnnotation)
      .attributes("style");

    expect(legacyAnnotationStyles).toMatch("font-size: 15.9996px");
    expect(legacyAnnotationStyles).toMatch("border: 4px solid #000;");
    expect(legacyAnnotationStyles).toMatch("background: rgb(0, 0, 0);");
    expect(legacyAnnotationStyles).toMatch("width: 100%;");
    expect(legacyAnnotationStyles).toMatch("height: 100%;");
    expect(legacyAnnotationStyles).toMatch("text-align: right;");
    expect(legacyAnnotationStyles).toMatch("padding: 3px;");
  });

  it("honors annotationsFontSizePointToPixelFactor", () => {
    const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2 };
    const { wrapper } = doMount({
      props: {
        annotation: {
          text: {
            value: "someopthertextdkenaendfkejkansn3",
            contentType: TypedText.ContentTypeEnum.Plain,
          },
          styleRanges: [
            { start: 3, length: 1, italic: true, bold: true, fontSize: 13 },
          ],
        },
      },
      mocks: { $shapes: shapes },
    });

    const spans = wrapper.findAll("span");
    expect(spans[1].attributes().style).toBe(
      "font-size: 26px; font-weight: bold; font-style: italic;",
    );
  });
});
