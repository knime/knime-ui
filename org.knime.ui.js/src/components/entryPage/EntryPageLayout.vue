<script>
import { mapState } from 'vuex';
import Button from 'webapps-common/ui/components/Button.vue';
// import RocketIcon from 'webapps-common/ui/assets/img/icons/rocket.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';

import { APP_ROUTES, getPathFromRouteName } from '@/router';
import Page from '@/components/common/Page.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import PageSideMenu from '@/components/common/PageSideMenu.vue';

export default {
    components: {
        Page,
        PageHeader,
        PageSideMenu,
        Button
    },

    data() {
        return {
            sidebarItems: [
                // TODO: bring back when Get Started page is displayed
                // {
                //     route: getPathFromRouteName(APP_ROUTES.EntryPage.GetStartedPage),
                //     text: 'Get started',
                //     icon: RocketIcon
                // },
                {
                    route: getPathFromRouteName(APP_ROUTES.EntryPage.SpaceSelectionPage),
                    text: 'Spaces',
                    icon: CubeIcon
                }
            ]
        };
    },

    computed: {
        ...mapState('application', ['availableUpdates']),
        updateMessage() {
            if (this.availableUpdates.newReleases) {
                const availableUpdate = this.availableUpdates.newReleases.find(obj => obj.isUpdatePossible === true);
                const updateVersion = availableUpdate.shortName;

                return `Get the latest features and enhancements! Update now to ${updateVersion}`;
            }

            if (this.availableUpdates.bugfixes.length === 1) {
                return 'There is an update for 1 extension available.';
            }

            if (this.availableUpdates.bugfixes.length > 1) {
                return `There are updates for ${this.availableUpdates.bugfixes.length} extensions available.`;
            }

            return null;
        },
        pageTitle() {
            const titles = {
                [APP_ROUTES.EntryPage.GetStartedPage]: 'Get started',
                [APP_ROUTES.EntryPage.SpaceSelectionPage]: 'Spaces'
            };

            return titles[this.$route.name];
        }
    },

    beforeMount() {
        // TODO: remove when Get Started page is displayed
        // as this overules the redirects to the Get Started page and uses the selection page instead
        this.$router.push({ name: APP_ROUTES.EntryPage.SpaceSelectionPage });
    },
    methods: {
        openUpdateDialog() {
            window.openUpdateDialog();
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
          <PageSideMenu :items="sidebarItems" />
        </div>

        <div class="grid-item-9 main-content">
          <RouterView />
        </div>
      </div>
    </section>

    <section
      v-if="availableUpdates"
      class="footer-wrapper"
    >
      <div class="grid-container">
        <div class="grid-item-12 update-bar">
          <span class="text">
            {{ updateMessage }}
          </span>
          <Button
            with-border
            @click="openUpdateDialog"
          >
            Update now
          </Button>
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

    & > :last-child:has(.recent-workflows) {
      flex: 1;
    }
  }
}

section.footer-wrapper {
  background-color: var(--knime-yellow);

  & .grid-container {
    & .update-bar {
      height: 100px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: "Roboto Condensed", sans-serif;
      font-size: 22px;
      color: var(--knime-masala);
      font-weight: 700;
    }
  }
}
</style>
