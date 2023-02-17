<script>
import Modal from 'webapps-common/ui/components/Modal.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import Label from 'webapps-common/ui/components/forms/Label.vue';
import { mapActions } from 'vuex';

export default {
    components: {
        Modal,
        Button,
        Label,
        InputField
    },
    props: {
        modalActive: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            workflowName: ''
        };
    },
    methods: {
        ...mapActions('spaces', ['createWorkflow']),
        closeModal() {
            this.$emit('cancel');
        }
    }
};
</script>

<template>
  <Modal
    ref="modalRef"
    :active="modalActive"
    title="Create a new KNIME workflow"
    style-type="info"
    @cancel="closeModal"
  >
    <template #confirmation>
      <Label
        text="Workflow name"
      >
        <InputField
          v-model="workflowName"
          type="text"
          title="Workflow name"
        />
      </Label>
    </template>
    <template #controls>
      <Button
        with-border
        @click="closeModal"
      >
        <strong>Cancel</strong>
      </Button>
      <Button
        primary
        with-border
      >
        <strong>Create</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 960px;
}
</style>

