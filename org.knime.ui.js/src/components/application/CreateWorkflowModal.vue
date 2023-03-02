<script>
import { mapState } from 'vuex';
import Modal from 'webapps-common/ui/components/Modal.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import Label from 'webapps-common/ui/components/forms/Label.vue';

import WorkflowNameValidator from '@/components/common/WorkflowNameValidator.vue';

import { escapeStack } from '@/mixins/escapeStack';

export default {
    components: {
        Modal,
        Button,
        Label,
        InputField,
        WorkflowNameValidator
    },

    mixins: [
        escapeStack({
            alwaysActive: true,
            onEscape() {
                if (this.isCreateWorkflowModalOpen) {
                    this.closeModal();
                }
            }
        })
    ],

    data() {
        return {
            workflowName: 'KNIME_project',
            enableSubmit: true,
            cleanName: () => {}
        };
    },

    computed: {
        ...mapState('spaces', ['isCreateWorkflowModalOpen', 'activeSpace'])
    },

    watch: {
        isCreateWorkflowModalOpen: {
            immediate: true,
            handler() {
                if (this.isCreateWorkflowModalOpen) {
                    this.setNameSuggestion();
                    setTimeout(() => {
                        this.$refs.inputRef?.$refs?.input?.focus();
                    // eslint-disable-next-line no-magic-numbers
                    }, 200);
                }
            }
        }
    },

    methods: {
        async onSubmit() {
            try {
                await this.$store.dispatch(
                    'spaces/createWorkflow',
                    { workflowName: this.cleanName(this.workflowName) }
                );
                this.closeModal();
            } catch (error) {
                consola.log(`There was an error creating the workflow`, error);
            }
        },
        closeModal() {
            this.enableSubmit = true;
            this.$store.commit('spaces/setIsCreateWorkflowModalOpen', false);
        },
        onkeyup(keyupEvent, isValid) {
            if (keyupEvent.key === 'Enter' && isValid) {
                this.onSubmit();
            }
        },
        onValidChange(isValid) {
            this.enableSubmit = isValid;
        },
        getNameCleanerFunction(cleanName) {
            this.cleanName = cleanName;
        },
        setNameSuggestion() {
            const NAME_TEMPLATE = 'KNIME_project';
            const items = this.activeSpace.activeWorkflowGroup.items;
            if (!items.some((item) => item.name === `${NAME_TEMPLATE}`)) {
                this.workflowName = `${NAME_TEMPLATE}`;
                return;
            }

            let counter = 1;
            while (items.some(({ name }) => name === `${NAME_TEMPLATE}${counter}`)) {
                counter++;
            }
            this.workflowName = `${NAME_TEMPLATE}${counter}`;
        }
    }
};
</script>

<template>
  <Modal
    v-show="isCreateWorkflowModalOpen"
    ref="modalRef"
    :active="isCreateWorkflowModalOpen"
    title="Create a new workflow"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #confirmation>
      <Label text="Workflow name">
        <WorkflowNameValidator
          :name="workflowName"
          :workflow-items="activeSpace.activeWorkflowGroup.items"
          @is-valid-changed="onValidChange"
          @clean-name="getNameCleanerFunction"
        >
          <template #default="{ isValid, errorMessage }">
            <div>
              <InputField
                ref="inputRef"
                v-model="workflowName"
                type="text"
                title="Workflow name"
                :is-valid="isValid"
                @keyup="onkeyup($event, isValid)"
              />
              <div
                v-if="!isValid"
                class="item-error"
              >
                <span>{{ errorMessage }}</span>
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
        :disabled="!enableSubmit"
        @click="onSubmit"
      >
        <strong>Create</strong>
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

