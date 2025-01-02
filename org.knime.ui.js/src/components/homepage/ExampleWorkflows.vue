<script setup lang="ts">
import { computed } from "vue";
import { isEqual } from "lodash-es";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { Button } from "@knime/components";
import ArrowRightIcon from "@knime/styles/img/icons/arrow-right.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";

import type { ExampleProject } from "@/api/custom-types";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";
import { useApplicationStore } from "@/store/application/application";
import { useSettingsStore } from "@/store/settings";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";

import PageTitle from "./PageTitle.vue";

const { exampleProjects } = storeToRefs(useApplicationStore());
const { setExampleProjects } = useApplicationStore();
const { settings } = storeToRefs(useSettingsStore());
const { updateSetting } = useSettingsStore();
const { openProject } = useSpaceOperationsStore();
const $router = useRouter();
const { toastPresets } = getToastPresets();

const shouldShowExampleWorkflows = computed(
  () =>
    exampleProjects.value.length > 0 &&
    settings.value.shouldShowExampleWorkflows,
);

const onExampleClick = async (example: ExampleProject) => {
  try {
    await openProject({
      ...example.origin,
      $router,
    });
  } catch (error) {
    consola.error("could not open example workflow", error);

    toastPresets.app.openProjectFailed({ error });

    const newExampleProjects = exampleProjects.value.filter(
      (item) => !isEqual(item.origin, example.origin),
    );
    setExampleProjects(newExampleProjects);
  }
};

const dismissExamples = () => {
  updateSetting({
    key: "shouldShowExampleWorkflows",
    value: false,
  });
};
</script>

<template>
  <div v-if="shouldShowExampleWorkflows" class="example-workflows">
    <PageTitle title="Welcome">
      <template #append>
        <Button compact class="dismiss-examples" @click="dismissExamples">
          Dismiss examples
          <CloseIcon />
        </Button>
      </template>
    </PageTitle>

    <div class="cards">
      <Card
        v-for="(example, index) in exampleProjects"
        :key="index"
        class="example-workflow-card"
        @click="onExampleClick(example)"
      >
        <CardContent padded>
          <img
            class="card-img"
            :src="`data:image/svg+xml;base64,${example.svg}`"
            :alt="`Preview of ${example.name}`"
          />
          <span class="name">{{ example.name }}</span>
        </CardContent>
      </Card>
    </div>
    <a
      class="more-on-hub"
      href="https://knime.com/modern-ui-hub-home-link?src=knimeappmodernui"
    >
      <ArrowRightIcon />
      <span>Show me more examples on the KNIME Community Hub</span>
    </a>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.example-workflows {
  --spacing: 24px;

  display: flex;
  flex-direction: column;
  padding: var(--spacing) 5px var(--spacing) var(--spacing);

  & .dismiss-examples {
    margin-top: -2px;

    & svg {
      padding-top: 2px;

      @mixin svg-icon-size 18;
    }
  }

  & .more-on-hub {
    padding-top: var(--spacing);
    display: flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    font-size: 13px;
    color: var(--knime-dove-gray);

    &:hover {
      text-decoration: underline;
    }

    & span {
      padding-top: 1px;
    }

    & svg {
      @mixin svg-icon-size 12;
    }
  }

  & .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, 250px);
    max-height: 200px;
    padding: 2px 10px;
    margin-left: -10px;
    overflow: hidden;
    gap: var(--spacing);

    & .example-workflow-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 250px;
      max-height: 180px;
      min-height: 180px;

      & svg {
        @mixin svg-icon-size 70;
      }

      & .card-img {
        width: 100%;
        max-height: 77px;
        object-fit: contain;
      }

      & .name {
        text-align: center;
        font-size: 13px;
        margin-top: 20px;
        font-weight: 700;
      }
    }
  }
}
</style>
