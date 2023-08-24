<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";

const store = useStore();

const isDisplayJobModalOpen = computed(
  () => store.state.spaces.displayJobModal.isOpen,
);
const selectedItemName = computed(
  () => `Deployments and jobs of "${store.state.spaces.displayJobModal.name}"`,
);
const selectedItemJobs = computed(() => store.state.spaces.jobs);

// const closeModal = () => {
//   console.log(selectedItemJobs);
//   formatDate(selectedItemJobs.value[0].createdAt);
//   store.commit("spaces/setDisplayJobModal", {
//     isOpen: false,
//   });
// };

const formatDate = (date: string) => {
  const timezoneRegexPattern = /\[.*\]/;
  const formattedDate = new Date(
    Date.parse(date.replace(timezoneRegexPattern, "")),
  );
  console.log(formattedDate);

  return formattedDate.toLocaleString("en-US");
};

const closeModal = () => {
  console.log(selectedItemJobs.value[0]);
  formatDate(selectedItemJobs.value[0].createdAt);
  store.commit("spaces/setDisplayJobModal", {
    isOpen: false,
  });
};
</script>

<template>
  <Modal
    v-show="isDisplayJobModalOpen"
    ref="modalRef"
    :active="isDisplayJobModalOpen"
    :title="selectedItemName"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><CirclePlayIcon /></template>
    <template #confirmation>
      <div class="wrapper">
        <h2>Jobs</h2>
        <table v-if="selectedItemJobs.length > 0">
          <thead>
            <tr>
              <th class="created-at">Created at</th>
              <th class="owner">Owner</th>
              <th class="state">State</th>
              <th class="node-messages">Node messages</th>
              <th class="action" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in selectedItemJobs" :key="job.id">
              <td>{{ job.createdAt }}</td>
              <td>{{ job.owner }}</td>
              <td>{{ job.state }}</td>
              <td>0 Messages</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-message">No jobs available.</p>
      </div>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
}

.wrapper {
  font-family: Rob;
  color: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;

  & table {
    font-size: 18px;
    font-weight: bold;
    border-spacing: 0;
    width: 100%;

    & :deep(td > a) {
      text-decoration: none;
      display: block;
      text-overflow: ellipsis;
      overflow: hidden;
      width: 100%;
      padding-right: 15px;
    }

    & :deep(td:first-child > a) {
      padding-left: 15px;
    }
  }

  & table :deep(tr) {
    display: flex;
  }

  & th,
  table :deep(td) {
    display: flex;
    font-size: 13px;
    font-weight: 300;
    line-height: 50px;
    height: 50px;
    text-align: left;
    white-space: nowrap;
    padding: 0;
  }

  & th {
    font-weight: 500;
  }

  & .empty-message {
    font-size: 13px;
    line-height: 18px;
  }
}
</style>
