<script lang="ts" setup>
import { ref, watch } from "vue";

import type { Link } from "@/api/gateway-api/generated-api";

import LinkList from "webapps-common/ui/components/LinkList.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import TrashIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import Label from "webapps-common/ui/components/forms/Label.vue";
import Button from "webapps-common/ui/components/Button.vue";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus.svg";
import { buildUrlRegex } from "@/util/regex";

const URL_REGEX = buildUrlRegex(true);
/**
 * Wraps the webapps-common LinkList component to render them alongside a title and a separator
 */

interface Props {
  links: Array<Link>;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), { editable: false });

const emit = defineEmits<{
  (e: "change", links: Array<Link>): void;
  (e: "valid", value: boolean): void;
}>();

const editedLinks = ref(props.links);

const isValidUrl = (url: string) => {
  return URL_REGEX.test(url);
};

watch(
  editedLinks,
  () => {
    const isValid = editedLinks.value.every((link) => isValidUrl(link.url));
    emit("change", editedLinks.value);
    emit("valid", isValid);
  },
  { deep: true }
);

const addLink = () => {
  editedLinks.value = editedLinks.value.concat({ text: "", url: "" });
};

const removeLink = (index: number) => {
  editedLinks.value = editedLinks.value.filter((_, _index) => _index !== index);
};
</script>

<template>
  <div class="external-resources-list">
    <h2>External resources</h2>
    <hr />
    <template v-if="!editable">
      <LinkList v-if="links.length" :links="links" />
      <!-- Use MetadataPlaceholder? -->
      <div v-else class="placeholder">No links have been added yet</div>
    </template>

    <template v-else>
      <div v-for="(link, index) of editedLinks" :key="index" class="edit-link">
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
                v-model="editedLinks[index].text"
                type="text"
                title="Text"
              />
            </div>
          </Label>
        </div>

        <div class="edit-link-url">
          <Label text="URL" compact>
            <div>
              <InputField
                v-model="editedLinks[index].url"
                type="text"
                title="URL"
              />
              <div
                v-if="!isValidUrl(editedLinks[index].url)"
                class="item-error"
              >
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
  margin-bottom: 15px;

  & h2 {
    margin: 0;
    font-weight: 400;
    font-size: 18px;
    line-height: 36px;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & ul {
    --icon-size: 16px;

    column-count: 1;
    margin-bottom: -6px;
    line-height: 18px;

    & :deep(svg) {
      top: 2px;
    }
  }

  & .placeholder {
    padding-top: 10px;
    font-style: italic;
    color: var(--knime-dove-gray);
  }

  & .add-link-btn {
    margin-top: 20px;
  }

  & .edit-link {
    padding: 8px 0;

    & .edit-link-header {
      display: flex;
      align-items: center;

      & .delete-link-btn {
        margin-left: auto;
      }
    }

    & .edit-link-text,
    & .edit-link-url {
      padding-top: 8px;
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
