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
        fetchSpaceProviders() {
            this.$store.dispatch('spaces/fetchAllSpaceProviders');
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
  <GridOutbreaker :color="knimeColors.Porcelain">
    <section
      v-for="spaceProvider of spaceProviders"
      :key="spaceProvider.id"
      class="space-selection"
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
            @click="onLogout(spaceProvider.id)"
          >
            Log out
          </Button>

          <Button
            v-if="shouldDisplayLoginButton(spaceProvider)"
            primary
            compact
            @click="onLogin(spaceProvider.id)"
          >
            {{ spaceProvider.connectionMode === 'AUTHENTICATED' ? 'LOGIN' : 'CONNECT' }}
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

section.space-selection {
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
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-content: space-between;
    --card-margin: 24px;

    & .card {
      margin-bottom: var(--card-margin);
      flex-basis: calc(50% - var(--card-margin) / 2);
    }
  }
}
</style>
