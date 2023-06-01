<script setup lang="ts">
import Modal from "webapps-common/ui/components/Modal.vue";
import Button from "webapps-common/ui/components/Button.vue";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import Label from "webapps-common/ui/components/forms/Label.vue";
import type { isActive } from "@tiptap/vue-3";
import { computed, onMounted } from "vue";

interface Props {
  text: string;
  url: string;
  isActive: boolean;
}

const props = defineProps<Props>();

let editedText: string,
  editedUrl: string;

onMounted(() => {
  editedText = props.text;
  editedUrl = props.url;
})

const emit = defineEmits<{
  (e: "addLink", text: string, url: string): void;
  (e: "cancelAddLink"): void;
}>();


const closeModal = () => {
    emit("cancelAddLink");
};

const onSubmit = () => {
    emit("addLink", editedText, editedUrl);
};

// TODO add link validation

const isValid = computed(() => {
  const validText = editedText !== props.text;
  const validURL = editedUrl !== props.url;

  return validText || validURL;
});
</script>

<template>
  <Modal
    :active="isActive"
    title="Add a link"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #confirmation>
      <Label text="Text">
        <div>
            <InputField
            v-model="editedText"
            type="text"
            title="Text"
            />
        </div>
      </Label>
      <Label text="URL">
        <div>
            <InputField
            v-model="editedUrl"
            type="text"
            title="URL"
            />
        </div>
      </Label>
    </template>
    <template #controls>
      <Button with-border @click="closeModal">
        <strong>Cancel</strong>
      </Button>
      <Button primary :disabled="isValid" @click="onSubmit">
        <strong>Add link</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 400px;
}

.item-error {
  font-size: 12px;
  font-weight: 400;
  color: var(--theme-color-error);
  margin-top: 7px;
  white-space: normal;
}
</style>
