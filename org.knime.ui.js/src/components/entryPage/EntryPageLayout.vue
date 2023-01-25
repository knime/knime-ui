<script>
import RocketIcon from 'webapps-common/ui/assets/img/icons/rocket.svg';
//import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import KnimeLogo from 'webapps-common/ui/assets/img/KNIME_Logo_gray.svg';

import { APP_ROUTES, getPathFromRouteName } from '@/router';
import Page from '@/components/common/Page.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import PageSideMenu from '@/components/common/PageSideMenu.vue';

export default {
    components: {
        Page,
        KnimeLogo,
        PageHeader,
        PageSideMenu
    },

    data() {
        return {
            sidebarItems: [
                {
                    route: getPathFromRouteName(APP_ROUTES.EntryPage.GetStartedPage),
                    text: 'Get started',
                    icon: RocketIcon
                }
                // TODO: NXT-1461 enable again when we have a dedicated stand alone SpaceSelection page again
                // {
                //    route: getPathFromRouteName(APP_ROUTES.EntryPage.SpaceSelectionPage),
                //    text: 'Spaces',
                //    icon: CubeIcon
                // }
            ]
        };
    },

    computed: {
        pageTitle() {
            const titles = {
                [APP_ROUTES.EntryPage.GetStartedPage]: 'Get started',
                [APP_ROUTES.EntryPage.SpaceSelectionPage]: 'Spaces'
            };

            return titles[this.$route.name];
        },
        showSidebar() {
            return this.sidebarItems.length > 1;
        }
    }
};
</script>

<template>
  <Page with-background>
    <PageHeader
      :left-offset="3"
      :title="pageTitle"
    />

    <section class="main-content-wrapper">
      <div class="grid-container">
        <div class="grid-item-2 sidebar">
          <PageSideMenu
            v-if="showSidebar"
            :items="sidebarItems"
          />
          <div
            v-else
            class="logo"
          >
            <KnimeLogo />
          </div>
        </div>

        <div class="grid-item-9 main-content">
          <RouterView />
        </div>
      </div>
    </section>
  </Page>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section.main-content-wrapper {
  flex: 1;

  & .logo svg {
    width: 100%;
    max-width: 248px;
    height: 70px;
    display: block;
    margin-top: -11px;
  }

  & .grid-container {
    height: 100%;
  }

  & .main-content {
    display: flex;
    flex-direction: column;

    & > :last-child:has(.recent-workflows) {
      flex: 1;
    }
  }
}
</style>
