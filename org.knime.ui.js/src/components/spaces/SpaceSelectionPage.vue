<script>
import { mapState } from 'vuex';
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';
import Button from 'webapps-common/ui/components/Button.vue';

import { APP_ROUTES } from '@/router';
import GridOutbreaker from '@/components/common/GridOutbreaker.vue';
import Avatar from '@/components/common/Avatar.vue';

import SpaceCard from './SpaceCard.vue';

export default {
    components: {
        Avatar,
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
        ...mapState('spaces', ['spaceProviders'])
    },

    created() {
        this.fetchSpaceProviders();
    },

    methods: {
        async fetchSpaceProviders() {
            await this.$store.dispatch('spaces/fetchAllSpaceProviders');
        },
        
        onLogin(spaceProviderId) {
            this.$store.dispatch('spaces/connectProvider', { spaceProviderId });
        },

        onLogout(spaceProviderId) {
            this.$store.dispatch('spaces/disconnectProvider', { spaceProviderId });
        },

        onSpaceCardClick({ space, spaceProvider }) {
            this.$store.commit('spaces/setActiveSpaceProvider', spaceProvider);
            this.$store.commit('spaces/setActiveSpaceId', space.id);
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
          <Avatar :text="'MS'" />
          <span class="owner-name">Mine</span>
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
        margin-left: 3px;
      }
    }
  }

  & .cards {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
