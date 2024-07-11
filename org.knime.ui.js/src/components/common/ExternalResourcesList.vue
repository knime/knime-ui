<script lang="ts" setup>
import { computed, watch } from "vue";
import type { Link } from "@/api/gateway-api/generated-api";

import {
  LinkList,
  FunctionButton,
  InputField,
  Label,
  Button,
} from "@knime/components";
import TrashIcon from "@knime/styles/img/icons/trash.svg";
import PlusIcon from "@knime/styles/img/icons/plus.svg";
import { buildUrlRegex } from "@/util/regex";

const URL_REGEX = buildUrlRegex(true);
/**
 * Wraps the webapps-common LinkList component to render them alongside a title and a separator
 */

interface Props {
  modelValue: Array<Link>;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), { editable: false });

const emit = defineEmits<{
  (e: "valid", value: boolean): void;
  (e: "update:modelValue", value: Array<Link>): void;
}>();

const isValidUrl = (url: string) => {
  return URL_REGEX.test(url);
};

const hasInvalidUrl = computed(() => {
  return props.modelValue.some(({ url, text }) => !isValidUrl(url) || !text);
});

watch(
  hasInvalidUrl,
  () => {
    emit("valid", !hasInvalidUrl.value);
  },
  { immediate: true },
);

const addLink = () => {
  emit("update:modelValue", props.modelValue.concat({ text: "", url: "" }));
};

const removeLink = (index: number) => {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, _index) => _index !== index),
  );
};

const updateField = <K extends keyof Link, V = Link[K]>(
  property: K,
  value: V,
  index: number,
) => {
  emit(
    "update:modelValue",
    props.modelValue.map((link, _index) => {
      return index === _index ? { ...link, [property]: value } : link;
    }),
  );
};
</script>

<template>
  <div class="external-resources-list">
    <h2 :class="['section', { form: editable }]">External resources</h2>
    <template v-if="!editable">
      <LinkList v-if="modelValue.length" :links="modelValue" />
      <!-- Use MetadataPlaceholder? -->
      <div v-else class="placeholder">No links have been added yet</div>
    </template>

    <template v-else>
      <div v-for="(link, index) of modelValue" :key="index" class="edit-link">
        <div class="edit-link-header">
          Link {{ index + 1 }}
          <FunctionButton class="delete-link-btn" @click="removeLink(index)">
            <TrashIcon />
          </FunctionButton>
        </div>

        <div class="edit-link-text">
          <Label text="Text" compact>
            <div>
              <InputField
                :model-value="modelValue[index].text"
                type="text"
                title="Text"
                @update:model-value="updateField('text', $event, index)"
              />
              <div v-if="!modelValue[index].text" class="item-error">
                <span>Text is required</span>
              </div>
            </div>
          </Label>
        </div>

        <div class="edit-link-url">
          <Label text="URL" compact>
            <div>
              <InputField
                :model-value="modelValue[index].url"
                type="text"
                title="URL"
                @update:model-value="updateField('url', $event, index)"
              />
              <div v-if="!isValidUrl(modelValue[index].url)" class="item-error">
                <span>Invalid URL</span>
              </div>
            </div>
          </Label>
        </div>
      </div>

      <Button class="add-link-btn" with-border compact @click="addLink">
        <PlusIcon />
        Add external resource
      </Button>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.external-resources-list {
  & .edit-link-url {
    margin-bottom: 10px;
  }

  & h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 36px;
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & ul {
    --icon-size: 16px;

    column-count: 1;
    margin-bottom: -6px;
    line-height: 18px;
    font-size: 13px;

    & :deep(svg) {
      top: 2px;
    }
  }

  & .placeholder {
    padding-top: 10px;
    font-style: italic;
    font-size: 13px;
    color: var(--knime-dove-gray);
  }

  & .edit-link {
    padding: 0;
    margin-top: 10px;

    & .edit-link-header {
      display: flex;
      align-items: center;

      & .delete-link-btn {
        margin-left: auto;
      }
    }

    & .edit-link-text,
    & .edit-link-url {
      margin-top: 10px;
    }

    & .item-error {
      font-size: 12px;
      font-weight: 400;
      color: var(--theme-color-error);
      margin-top: 7px;
      white-space: normal;
    }
  }
}
</style>
