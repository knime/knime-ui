import { type PropType, defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

import { mockStores } from "./mockStores";

export const mountComposable = <T extends (...args: any) => any>({
  composable,
  composableProps,
  mockedStores,
}: {
  composable: T;
  composableProps: Parameters<T>[0];
  mockedStores?: ReturnType<typeof mockStores>;
}) => {
  const TestComponent = defineComponent({
    props: {
      composableProps: {
        type: Object as PropType<typeof composableProps>,
        required: true,
      },
    },
    setup(props) {
      const count = ref(1);

      const increment = () => {
        const newValue = (count.value += 1);
        return newValue;
      };

      const composableResults = composable(props.composableProps);

      return {
        composableResult:
          typeof composableResults === "object"
            ? { ...composableResults }
            : composableResults,
        count,
        increment,
      };
    },
    template: "<div>{{this.count}}</div>",
  });

  const global = mockedStores ? { plugins: [mockedStores.testingPinia] } : {};

  const wrapper = mount(TestComponent, {
    props: { composableProps },
    global,
  });

  const lifeCycle = {
    unmount: () => wrapper.unmount(),
    triggerUpdate: () => {
      wrapper.vm.increment();
      return wrapper.vm.$nextTick();
    },
  };

  const getComposableResult = () =>
    wrapper.vm.composableResult as ReturnType<T>;

  return {
    getComposableResult,
    lifeCycle,
  };
};
