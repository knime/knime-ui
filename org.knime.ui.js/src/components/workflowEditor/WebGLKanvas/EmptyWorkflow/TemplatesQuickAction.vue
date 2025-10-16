<script setup lang="ts">
import { isEqual } from "lodash-es";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import type { ExampleProject } from "@/api/custom-types";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";

const { exampleProjects } = storeToRefs(useApplicationStore());
const { setExampleProjects } = useApplicationStore();
const { openProject } = useSpaceOperationsStore();
const $router = useRouter();
const { toastPresets } = getToastPresets();

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
</script>

<template>
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
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-height: 200px;
  padding: 2px 10px;
  margin-left: -10px;
  overflow: hidden;
  gap: var(--space-16);

  & .example-workflow-card {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 250px;
    max-height: 180px;
    min-height: 180px;

    & svg {
      @mixin svg-icon-size 30;
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
</style>
