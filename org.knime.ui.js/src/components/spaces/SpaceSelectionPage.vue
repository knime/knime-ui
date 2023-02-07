<script>
import { mapState } from 'vuex';
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';
import Button from 'webapps-common/ui/components/Button.vue';

import { APP_ROUTES } from '@/router';
import GridOutbreaker from '@/components/common/GridOutbreaker.vue';

import SpaceCard from './SpaceCard.vue';

export default {
    components: {
        GridOutbreaker,
        SpaceCard,
        Button
    },

    data() {
        return {
            knimeColors
        };
    },

    computed: {
        ...mapState('spaces', ['spaceProviders', 'spaceBrowser'])
    },

    beforeMount() {
        // redirect to browsing page if a space was selected
        if (this.spaceBrowser.spaceId) {
            this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
        } else {
            // TODO: NXT-1461 remove this when this is a real page again
            this.$router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
        }
    },
    created() {
        this.$store.dispatch('spaces/fetchAllSpaceProviders');
    },

    methods: {
        onLogin(spaceProviderId) {
            this.$store.dispatch('spaces/connectProvider', { spaceProviderId });
        },

        onLogout(spaceProviderId) {
            this.$store.dispatch('spaces/disconnectProvider', { spaceProviderId });
        },

        async onSpaceCardClick({ space, spaceProvider }) {
            this.$store.commit('spaces/setActiveSpaceProvider', spaceProvider);
            this.$store.commit('spaces/setActiveSpaceId', space.id);
            await this.$store.dispatch('spaces/saveSpaceBrowserState');
            this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
        },

        isLocalSpace(spaceProvider) {
            return spaceProvider.connectionMode === 'AUTOMATIC' && spaceProvider.id === 'local';
        },

        shouldDisplayAvatar(spaceProvider) {
            return spaceProvider.connectionMode !== 'AUTOMATIC' && spaceProvider.connected;
        },

        shouldDisplayLoginButton(spaceProvider) {
            return spaceProvider.connectionMode !== 'AUTOMATIC' && !spaceProvider.connected;
        },

        shouldDisplayLogoutButton(spaceProvider) {
            return spaceProvider.connectionMode === 'AUTHENTICATED' && spaceProvider.connected;
        }
    }
};
</script>

<template>
  <GridOutbreaker
    v-if="spaceProviders"
    :color="knimeColors.Porcelain"
  >
    <section
      v-for="spaceProvider of spaceProviders"
      :key="spaceProvider.id"
      class="space-provider"
    >
      <div class="space-provider-name">
        <h2>{{ spaceProvider.name }}</h2>
        <div
          v-if="shouldDisplayAvatar(spaceProvider) && spaceProvider.user"
          class="owner"
        >
          <span class="owner-name">{{ spaceProvider.user.name }}</span>
        </div>

        <div class="connection-btn">
          <Button
            v-if="shouldDisplayLogoutButton(spaceProvider)"
            with-border
            compact
            class="logout"
            @click="onLogout(spaceProvider.id)"
          >
            Logout
          </Button>

          <Button
            v-if="shouldDisplayLoginButton(spaceProvider)"
            primary
            compact
            class="sign-in"
            @click="onLogin(spaceProvider.id)"
          >
            {{ spaceProvider.connectionMode === 'AUTHENTICATED' ? 'Sign in' : 'Connect' }}
          </Button>
        </div>
      </div>

      <div class="cards">
        <SpaceCard
          v-for="(space, id) of spaceProvider.spaces"
          :key="id"
          :space="space"
          :is-local="isLocalSpace(spaceProvider)"
          @click="onSpaceCardClick({ space: $event, spaceProvider })"
        />
      </div>
    </section>
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>
section.space-provider {
  padding-top: 30px;
  padding-bottom: 50px;

  & .space-provider-name {
    margin-bottom: 20px;
    display: flex;
    align-items: center;

    & .connection-btn {
      margin-left: auto;
    }

    & .owner {
      display: flex;
      align-items: center;

      & .owner-name {
        margin-left: 8px;
      }
    }
  }

  & .cards {
    display: grid;
    gap: 24px;
    word-break: break-all;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media only screen and (max-width: 900px) {
    & .cards {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }
}
</style>
