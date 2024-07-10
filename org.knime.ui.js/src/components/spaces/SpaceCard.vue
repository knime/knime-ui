<script setup lang="ts">
import { computed } from "vue";

import CubeIcon from "@knime/styles/img/icons/cube.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";

import Card from "@/components/common/Card.vue";
import CardHeader from "@/components/common/CardHeader.vue";
import CardContent from "@/components/common/CardContent.vue";
import CardFooter from "@/components/common/CardFooter.vue";
import type { SpaceProviderNS } from "@/api/custom-types";

const props = defineProps<{
  space: SpaceProviderNS.Space;
}>();

const emit = defineEmits<{
  click: [value: SpaceProviderNS.Space];
}>();

const icon = computed(() =>
  props.space.private ? PrivateSpaceIcon : CubeIcon,
);
</script>

<template>
  <Card @click="emit('click', space)">
    <CardHeader color="light">
      <Component :is="icon" />
    </CardHeader>

    <CardContent padded :centered="false" class="space-card-content">
      <h5>{{ space.name }}</h5>
      <p>{{ space.description }}</p>
    </CardContent>

    <CardFooter class="space-card-footer">
      <span>{{ space.owner }}</span>
    </CardFooter>
  </Card>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.space-card-content {
  & h5 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    line-height: 24px;
    max-width: 100%;
    text-align: left;

    @mixin multi-line-truncate 2;
  }

  & p {
    font-size: 16px;
    margin: 5px 0;
    font-weight: 300;
    line-height: 24px;
    max-width: 100%;
    text-align: left;

    @mixin multi-line-truncate 4;
  }

  & span {
    font-size: 11px;
    line-height: 16px;
  }
}

.space-card-footer {
  & span {
    font-size: 11px;
    line-height: 16px;
  }
}
</style>
