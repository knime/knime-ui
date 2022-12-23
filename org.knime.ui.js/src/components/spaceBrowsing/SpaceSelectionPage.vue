<script>
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';
import HeartIcon from 'webapps-common/ui/assets/img/icons/heart.svg';

import ComputerDesktopIcon from '@/assets/computer-desktop.svg';

import GridOutbreaker from '@/components/common/GridOutbreaker.vue';
import Avatar from '@/components/common/Avatar.vue';
import Card from '@/components/common/Card.vue';
import CardHeader from '@/components/common/CardHeader.vue';
import CardContent from '@/components/common/CardContent.vue';
import CardFooter from '@/components/common/CardFooter.vue';

import { APP_ROUTES } from '@/router';

import { fetchSpaceProvider } from '@api';

import { MOCK_DATA } from './mockData';

export default {
    components: {
        Avatar,
        GridOutbreaker,
        Card,
        CardHeader,
        CardContent,
        CardFooter,
        ComputerDesktopIcon,
        WorkflowIcon,
        CubeIcon,
        PrivateSpaceIcon,
        HeartIcon
    },

    data() {
        return {
            knimeColors,

            spaceProviders: []
        };
    },

    created() {
        this.updateSpaceProviders();
    },

    methods: {
        onSpaceCardClick(spaceId) {
            this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage, params: { spaceId } });
            console.log('You clicked on space', spaceId);
        },
        onLogin(spaceProviderId) {
            window.connectSpaceProvider(spaceProviderId);
            // TODO only update the one we connected to
            this.updateSpaceProviders();
        },
        async updateSpaceProviders() {
            this.spaceProviders = JSON.parse(window.getSpaceProviders());
            for (let i = 0; i < this.spaceProviders.length; i++) {
                const spaceProvider = await fetchSpaceProvider({ spaceProviderId: this.spaceProviders[i].id });
                this.spaceProviders[i].spaces = spaceProvider.spaces;
            }
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
      <div class="hub-space-name">
        <h2>{{ spaceProvider.name }}</h2>
        <div class="owner">
          <Avatar text="MS" />
          <span class="owner-name">Mine</span>
        </div>
      </div>

      <button
        v-if="!spaceProvider.connected"
        @click="onLogin(spaceProvider.id)"
      >
        LOGIN
      </button>

      <div class="cards">
        <Card
          v-for="(space, index) of spaceProvider.spaces"
          :key="`${space.name}--${index}`"
          @click="onSpaceCardClick(space.id)"
        >
          <CardHeader color="light">
            <Component :is="space.private ? 'PrivateSpaceIcon' : 'CubeIcon'" />
            <div class="kudos">
              <HeartIcon />
              <span>{{ space.kudos }}</span>
            </div>
          </CardHeader>

          <CardContent
            padded
            :centered="false"
            class="space-card-content"
          >
            <h5>{{ space.name }}</h5>
            <p>{{ space.description }}</p>
            <span>Last Update {{ space.lastUpdate }}</span>
          </CardContent>

          <CardFooter avatar="MS">
            <span><WorkflowIcon /> 2</span>
            <span><WorkflowIcon /> 2</span>
            <span><WorkflowIcon /> 2</span>
          </CardFooter>
        </Card>
      </div>
    </section>
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>

section.space-selection {
  padding-top: 30px;
  padding-bottom: 50px;

  & .hub-space-name {
    margin-bottom: 20px;

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

      & .kudos {
        display: flex;
        align-items: center;
        margin-left: auto;

        & span {
          margin-left: 10px;
          color: var(--knime-dove-gray);
          font-weight: 500;
          font-size: 13px;
          line-height: 18px;
        }
      }
    }
  }

  & .space-card-content {
    & h5 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      line-height: 24px;
    }

    & p {
      font-size: 16px;
      margin: 5px 0;
      font-weight: 300;
      line-height: 24px;
    }

    & span {
      font-size: 11px;
      line-height: 16px;
    }
  }
}
</style>
