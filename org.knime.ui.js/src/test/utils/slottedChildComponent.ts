import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

export const createSlottedChildComponent = (params: {
  slottedComponentTemplate: string;
  slottedComponentData?: any;
}) => {
  // Dummy component to be inserted in the slot
  const mockComponentInSlot = {
    name: "SlottedChild",
    template: params.slottedComponentTemplate,
    props: {
      scope: {
        type: Object,
        required: true,
      },
    },
    data() {
      return params.slottedComponentData || {};
    },
  };

  /**
   * Function used to render a slot that has a dummy component in it
   */
  const renderSlot = (props: unknown) =>
    h(mockComponentInSlot, { scope: props });

  /**
   * Given a test component wrapper, this function is used to find the
   * mocked component in the slot
   */
  const getSlottedChildComponent = (wrapper: VueWrapper<any>) =>
    wrapper.findComponent({ name: "SlottedChild" });

  const getSlottedStubProp = ({
    wrapper,
    propName,
  }: {
    wrapper: VueWrapper<any>;
    propName: string;
  }) => {
    // access the `scope` prop of the dummy slotted component and get value that was injected by
    // the parent component via the slot props
    return getSlottedChildComponent(wrapper).props("scope")[propName];
  };

  return {
    getSlottedChildComponent,
    mockComponentInSlot,
    getSlottedStubProp,
    renderSlot,
  };
};
