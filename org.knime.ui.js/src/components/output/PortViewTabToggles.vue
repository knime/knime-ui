<script lang="ts">
import type { PortViewDescriptor, PortViewDescriptorMapping } from '@/api/gateway-api/generated-api';
import { defineComponent, type PropType } from 'vue';

import ValueSwitch, { type ValueSwitchItem } from 'webapps-common/ui/components/forms/ValueSwitch.vue';

const getTabTogglesFromViewDescriptors = (
    data: {
        viewDescriptors: Array<PortViewDescriptor>;
        viewDescriptorMapping: PortViewDescriptorMapping;
    },
    currentNodeState: 'configured' | 'executed'
): Array<ValueSwitchItem> => {
    const descriptorIndexes = data.viewDescriptorMapping[currentNodeState];

    // non-spec views are disabled at the configured state
    const isDisabled = (item: PortViewDescriptor) => !item.isSpecView && currentNodeState === 'configured';

    return descriptorIndexes
        .map((index) => ({
            // tab id will be the descriptor index
            id: index.toString(),
            descriptor: data.viewDescriptors.at(index)
        }))
        .map(({ descriptor, id }) => ({
            id,
            text: descriptor.label,
            disabled: isDisabled(descriptor)
        }));
};

type ViewData = {
    index: number;
    isSpec: boolean;
}

export default defineComponent({
    components: {
        ValueSwitch
    },

    props: {
        modelValue: {
            type: [Object, null] as PropType<ViewData | null>,
            default: null
        },

        viewDescriptors: {
            type: Array as PropType<Array<PortViewDescriptor>>,
            required: true
        },

        viewDescriptorMapping: {
            type: Object as PropType<PortViewDescriptorMapping>,
            required: true
        },

        currentNodeState: {
            type: String as PropType<'configured' | 'executed'>,
            required: true
        }
    },

    emits: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        'update:modelValue': (_payload: ViewData) => true
    },

    computed: {
        tabTogglePosition() {
            const top = '50px';

            if (!this.$refs.tabToggles) {
                return { top, left: 0 };
            }

            // eslint-disable-next-line no-extra-parens
            const { width } = (this.$refs.tabToggles as { $el: HTMLElement }).$el.getBoundingClientRect();

            return {
                top,
                left: `calc(50% - ${width / 2}px)`
            };
        },

        tabToggles() {
            const tabToggles = getTabTogglesFromViewDescriptors(
                {
                    viewDescriptors: this.viewDescriptors,
                    viewDescriptorMapping: this.viewDescriptorMapping
                },
                this.currentNodeState
            );
            console.log('tabToggles', tabToggles);
            return tabToggles;
        }
    },

    watch: {
        modelValue: {
            handler() {
                if (this.modelValue === null) {
                    this.emitUpdate(this.tabToggles.at(0).id);
                }
            },
            immediate: true
        }
    },

    methods: {
        getViewDescriptorFromTabId(tabId: string) {
            return {
                index: Number(tabId),
                descriptor: this.viewDescriptors.at(Number(tabId))
            };
        },

        emitUpdate(tabId: string) {
            const {
                index,
                descriptor: { isSpecView }
            } = this.getViewDescriptorFromTabId(tabId);

            this.$emit('update:modelValue', { index, isSpec: isSpecView });
        }
    }
});
</script>

<template>
  <ValueSwitch
    v-show="tabToggles.length > 1"
    ref="tabToggles"
    class="tab-toggles"
    compact
    :possible-values="tabToggles"
    :model-value="modelValue && modelValue.index.toString()"
    @update:model-value="emitUpdate"
  />
</template>

<style lang="postcss" scoped>
.tab-toggles {
  position: absolute;
  left: v-bind("tabTogglePosition.left");
  top: v-bind("tabTogglePosition.top");
  z-index: 3;
}
</style>
