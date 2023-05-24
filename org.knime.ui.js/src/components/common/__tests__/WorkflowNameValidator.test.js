import { expect, describe, it } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import WorkflowNameValidator from "../WorkflowNameValidator.vue";

describe("WorkflowNameValidator", () => {
  const doMount = ({ props, data = { nameInSlot: "" } } = {}) => {
    const defaultProps = {
      name: "test name",
    };

    const componentInSlot = `<div
            id="slotted-component"
            :is-valid="scope.isValid"
            :error-message="scope.errorMessage"
            @click="() => (nameInSlot = scope.cleanNameFn(nameInSlot))"
        >{{nameInSlot}}</div>`;

    const getScopedComponent = {
      name: "SlottedChild",
      template: componentInSlot,
      props: {
        scope: {
          type: Object,
          required: true,
        },
      },
      data() {
        return data;
      },
    };

    const wrapper = mount(WorkflowNameValidator, {
      props: { ...defaultProps, ...props },
      slots: {
        default: (_props) => Vue.h(getScopedComponent, { scope: _props }),
      },
    });

    return { wrapper };
  };

  const getSlottedChildComponent = (wrapper) =>
    wrapper.findComponent({ name: "SlottedChild" });

  // eslint-disable-next-line arrow-body-style
  const getSlottedStubProp = ({ wrapper, propName }) => {
    // access the `scope` prop of the dummy slotted component and get value that was injected by
    // WorkflowNameValidator via the slot props
    return getSlottedChildComponent(wrapper).props("scope")[propName];
  };

  it("should check for invalid characters", async () => {
    const { wrapper } = doMount();

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeTruthy();

    await wrapper.setProps({ name: "&*9a?/\\sdasd" });

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeFalsy();
    expect(getSlottedStubProp({ wrapper, propName: "errorMessage" })).toMatch(
      "Name contains invalid characters"
    );
  });

  it("should check for name collision", async () => {
    const workflowItems = [{ id: "1", name: "first-item" }];
    const { wrapper } = doMount({
      props: { name: "test", workflowItems, currentItemId: "1" },
    });

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeTruthy();

    await wrapper.setProps({
      workflowItems: workflowItems.concat({ id: "2", name: "test" }),
    });

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeFalsy();
    expect(
      getSlottedStubProp({
        wrapper,
        propName: "errorMessage",
      })
    ).toMatch("Name is already taken by another workflow");
  });

  it("should check for name character limit", async () => {
    const { wrapper } = doMount();

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeTruthy();
    const newName = new Array(256)
      .fill(0)
      .map((_) => "a")
      .join("");

    await wrapper.setProps({ name: newName });

    expect(getSlottedStubProp({ wrapper, propName: "isValid" })).toBeFalsy();
    expect(getSlottedStubProp({ wrapper, propName: "errorMessage" })).toMatch(
      "exceeds 255 characters"
    );
  });

  it.each([".", "\\", "/"])(
    "should clean invalid prefix and suffix",
    async (invalidChar) => {
      const { wrapper } = doMount({
        data: { nameInSlot: `${invalidChar}some text${invalidChar}` },
      });

      await wrapper.trigger("click");
      expect(wrapper.text()).toMatch("some text");
    }
  );
});
