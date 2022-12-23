<script>
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

import ArrowRightIcon from 'webapps-common/ui/assets/img/icons/arrow-right.svg';

import GridOutbreaker from '@/components/common/GridOutbreaker.vue';
import Card from '@/components/common/Card.vue';
import CardHeader from '@/components/common/CardHeader.vue';
import CardContent from '@/components/common/CardContent.vue';

export default {
    components: {
        ArrowRightIcon,
        GridOutbreaker,
        Card,
        CardHeader,
        CardContent
    },

    data() {
        return {
            knimeColors
        };
    }
};
</script>

<template>
  <GridOutbreaker :color="knimeColors.SilverSandSemi">
    <section class="examples">
      <div class="grid-container">
        <div class="grid-item-12">
          <h2>Examples</h2>
        </div>
      </div>
              
      <div class="grid-container cards">
        <div class="grid-item-4">
          <Card
            link
            href="/space-browsing"
          >
            <CardHeader>Read excel file</CardHeader>

            <CardContent>
              <img
                class="card-img"
                src="@/assets/card-img-1.png"
                alt=""
              >
            </CardContent>
          </Card>
        </div>

        <div class="grid-item-4">
          <Card>
            <CardHeader>How to do v-lookup</CardHeader>

            <CardContent>
              <img
                class="card-img"
                src="@/assets/card-img-2.png"
                alt=""
              >
            </CardContent>
          </Card>
        </div>

        <div class="grid-item-4">
          <Card>
            <CardHeader>Merge excel files</CardHeader>

            <CardContent>
              <img
                class="card-img"
                src="@/assets/card-img-3.png"
                alt=""
              >
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="grid-container more-workflows">
        <ArrowRightIcon />
        <span>more workflows</span>
      </div>
    </section>
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section.examples {
  background: var(--knime-silver-sand-semi);
  padding-bottom: 20px;

  & .cards {
    & [class*="grid-item-"]:not(:first-child):not(:last-child) {
      margin: 0 15px;
    }
  }

  & .more-workflows {
    padding: 20px 0;
    align-items: center;
    justify-content: flex-start;

    & span {
      font-size: 16px;
      line-height: 20px;
    }

    & svg {
      margin-right: 8px;

      @mixin svg-icon-size 14;
    }
  }
}

section.recent-workflows {
  background: var(--knime-porcelain);
  height: 100%;
}
</style>
