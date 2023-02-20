<script>
import { mapState } from 'vuex';
import Modal from 'webapps-common/ui/components/Modal.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import Label from 'webapps-common/ui/components/forms/Label.vue';

import WorkflowNameValidator from '@/components/common/WorkflowNameValidator.vue';

export default {
    components: {
        Modal,
        Button,
        Label,
        InputField,
        WorkflowNameValidator
    },
    data() {
        return {
            workflowName: 'KNIME_project'
        };
    },
    computed: {
        ...mapState('spaces', ['isCreateWorkflowModalOpen'])
    },
    watch: {
        isCreateWorkflowModalOpen: {
            immediate: true,
            handler() {
                if (this.isCreateWorkflowModalOpen) {
                    setTimeout(() => {
                        this.$refs.inputRef?.$refs?.input?.focus();
                    }, 200);
                }
            }
        }
    },
    methods: {
        async onSubmit() {
            await this.$store.dispatch('spaces/createWorkflow', { workflowName: this.workflowName });
            // this.$emit('onSubmit');
            // check error...
            this.closeModal();
        },
        closeModal() {
            this.$store.commit('spaces/setIsCreateWorkflowModalOpen', false);
        }
    }
};
</script>

<template>
  <Modal
    v-if="isCreateWorkflowModalOpen"
    ref="modalRef"
    :active="isCreateWorkflowModalOpen"
    title="Create a new KNIME workflow"
    style-type="info"
    @cancel="closeModal"
  >
    <template #confirmation>
      <Label
        text="Workflow name"
      >
        <WorkflowNameValidator :name="workflowName">
          <template #default="{ isValid }">
            <div>
              <InputField
                ref="inputRef"
                v-model="workflowName"
                type="text"
                title="Workflow name"
                :is-valid="isValid"
              />
              <div
                v-if="!isValid"
                class="item-error"
              >
                <span>Name contains invalid characters *?#:"&lt;>%~|/</span>
              </div>
            </div>
          </template>
        </WorkflowNameValidator>
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
        @click="onSubmit"
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

.item-error {
  font-size: 12px;
  font-weight: 400;
  color: var(--theme-color-error);
  margin-top: 7px;
  white-space: normal;
}
</style>

