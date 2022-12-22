<script>
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

import ArrowRightIcon from 'webapps-common/ui/assets/img/icons/arrow-right.svg';
import RocketIcon from 'webapps-common/ui/assets/img/icons/rocket.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';

import Page from '@/components/common/Page.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import GridOutbreaker from '@/components/common/GridOutbreaker.vue';
import Card from '@/components/common/Card.vue';
import CardHeader from '@/components/common/CardHeader.vue';
import CardContent from '@/components/common/CardContent.vue';

import PageSideMenu from '@/components/common/PageSideMenu.vue';

export default {
    components: {
        ArrowRightIcon,
        Page,
        PageHeader,
        GridOutbreaker,
        PageSideMenu,
        Card,
        CardHeader,
        CardContent
    },

    data() {
        return {
            sidebarItems: [
                {
                    route: '/entry',
                    text: 'Get started',
                    icon: RocketIcon
                },
                {
                    route: '/space-selection',
                    text: 'Spaces',
                    icon: CubeIcon
                }
            ],
            knimeColors
        };
    },

    methods: {
        goToExamplesFolder() {
            const mockId = '12598722';
            this.$store.dispatch('spaceExplorer/fetchWorkflowGroupContent', { itemId: mockId });
        }
    }
};
</script>

<template>
  <Page with-background>
    <PageHeader
      :left-offset="3"
      title="Get started"
    />
    
    <section class="main-content-wrapper">
      <div class="grid-container">
        <div class="grid-item-2 sidebar">
          <PageSideMenu :items="sidebarItems" />
        </div>

        <div class="grid-item-9 main-content">
          <GridOutbreaker :color="knimeColors.SilverSandSemi">
            <section class="examples">
              <div class="grid-container">
                <div class="grid-item-12">
                  <h2>Examples</h2>
                </div>
              </div>
              
              <div class="grid-container cards">
                <div class="grid-item-4">
                  <Card>
                    <template #header>
                      <CardHeader>Read excel file</CardHeader>
                    </template>

                    <template #content>
                      <CardContent>
                        <img
                          class="card-img"
                          src="@/assets/card-img-1.png"
                          alt=""
                        >
                      </CardContent>
                    </template>
                  </Card>
                </div>

                <div class="grid-item-4">
                  <Card>
                    <template #header>
                      <CardHeader>How to do v-lookup</CardHeader>
                    </template>

                    <template #content>
                      <CardContent>
                        <img
                          class="card-img"
                          src="@/assets/card-img-2.png"
                          alt=""
                        >
                      </CardContent>
                    </template>
                  </Card>
                </div>

                <div class="grid-item-4">
                  <Card>
                    <template #header>
                      <CardHeader>Merge excel files</CardHeader>
                    </template>

                    <template #content>
                      <CardContent>
                        <img
                          class="card-img"
                          src="@/assets/card-img-3.png"
                          alt=""
                        >
                      </CardContent>
                    </template>
                  </Card>
                </div>
              </div>

              <div class="grid-container more-workflows">
                <ArrowRightIcon />
                <span @click="goToExamplesFolder">more workflows</span>
              </div>
            </section>
          </GridOutbreaker>

          <!-- <GridOutbreaker :color="knimeColors.Porcelain">
            <section class="recent-workflows">
              <div class="grid-container">
                <div class="grid-item-12">2</div>
              </div>
            </section>
          </GridOutbreaker> -->
        </div>
      </div>
    </section>
  </Page>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section.main-content-wrapper {
  flex: 1;

  & .grid-container {
    height: 100%;
  }

  & .main-content {
    display: flex;
    flex-direction: column;

    & >:last-child:has(.recent-workflows) {
      flex: 1
    }
  }
}

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
