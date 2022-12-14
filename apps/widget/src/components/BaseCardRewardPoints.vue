<template>
    <b-card class="m-2 disabled">
        <b-card-title class="d-flex">
            <div v-if="reward.platform" class="me-2">
                <img height="20" :src="platformImg[reward.platform]" :alt="reward.platform" />
            </div>
            <div class="flex-grow-1 pe-2">{{ reward.title }}</div>
            <div class="text-success fw-bold">{{ reward.amount }}</div>
        </b-card-title>

        <b-card-text>
            {{ reward.description }}
        </b-card-text>

        <blockquote class="d-flex" v-if="reward.platform && interactionLabel[reward.interaction]">
            {{ interactionLabel[reward.interaction] }}
            <b-link v-if="content" :href="content.url" target="_blank" class="text-muted ms-auto">
                <i class="fas fa-external-link-alt"></i>
            </b-link>
        </blockquote>

        <b-alert class="p-2" v-if="error && !isSubmitting" variant="danger" show>
            <i class="fas fa-exclamation-circle me-1"></i> {{ error }}
        </b-alert>

        <b-button v-if="!accountStore.isAuthenticated" @click="onClickSignin" variant="primary" block class="w-100">
            Claim <strong>{{ reward.amount }} points</strong>
        </b-button>

        <b-button v-else-if="reward.isClaimed" variant="primary" block class="w-100" disabled> Reward claimed</b-button>

        <b-button
            v-else-if="reward.platform && !isConnected"
            variant="primary"
            block
            class="w-100"
            @click="onClickConnect"
            :disabled="isSubmitting"
        >
            <template v-if="isSubmitting">
                <b-spinner small></b-spinner>
                Connecting platform
            </template>
            <template v-else>
                Connect <strong>{{ RewardConditionPlatform[reward.platform] }}</strong>
            </template>
        </b-button>

        <b-button v-else variant="primary" block class="w-100" @click="onClickClaim" :disabled="isSubmitting">
            <template v-if="isSubmitting">
                <b-spinner small></b-spinner>
                Adding points...
            </template>
            <template v-else>
                Claim <strong>{{ reward.amount }} points</strong>
            </template>
        </b-button>
    </b-card>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent, PropType } from 'vue';
import { WIDGET_URL } from '../config/secrets';
import { useAccountStore } from '../stores/Account';
import { useRewardStore } from '../stores/Reward';
import { RewardConditionPlatform, RewardConditionInteraction } from '../types/enums/rewards';

export default defineComponent({
    name: 'BaseCardRewardPoints',
    props: {
        reward: {
            type: Object as PropType<TPointReward>,
            required: true,
        },
    },
    data: function (): any {
        return {
            error: '',
            isSubmitting: false,
            RewardConditionPlatform,
            platformImg: {
                [RewardConditionPlatform.None]: '',
                [RewardConditionPlatform.YouTube]: require('../assets/youtube-logo.png'),
                [RewardConditionPlatform.Twitter]: require('../assets/twitter-logo.png'),
                [RewardConditionPlatform.Discord]: require('../assets/discord-logo.png'),
            },
            interactionLabel: {
                [RewardConditionInteraction.YouTubeLike]: 'Like a Youtube video.',
                [RewardConditionInteraction.YouTubeSubscribe]: 'Subscribe to a Youtube channel.',
                [RewardConditionInteraction.TwitterLike]: 'Like a Twitter tweet.',
                [RewardConditionInteraction.TwitterRetweet]: 'Retweet a Twitter tweet.',
                [RewardConditionInteraction.TwitterFollow]: 'Follow a Twitter account.',
                [RewardConditionInteraction.DiscordGuildJoined]: 'Join a Discord server.',
            },
            tooltipContent: 'Copy URL',
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useRewardStore),
        content() {
            if (!this.interactionLabel[this.reward.interaction] || !this.reward.content) return;
            return this.getChannelActionURL(this.reward.interaction, this.reward.content);
        },
        isConnected() {
            const { account } = useAccountStore();
            if (!account || !this.reward) return;

            switch (this.reward.platform) {
                case RewardConditionPlatform.YouTube:
                    return account.googleAccess;
                case RewardConditionPlatform.Twitter:
                    return account.twitterAccess;
                case RewardConditionPlatform.Discord:
                    return account.discordAccess;
                case RewardConditionPlatform.Github:
                    return account.githubAccess;
                case RewardConditionPlatform.Twitch:
                    return account.twitchAccess;
                default:
                    return true;
            }
        },
    },
    methods: {
        getChannelActionURL(interaction: RewardConditionInteraction, content: string) {
            switch (interaction) {
                case RewardConditionInteraction.YouTubeLike:
                    return { url: `https://youtu.be/${content}` };
                case RewardConditionInteraction.YouTubeSubscribe:
                    return { url: `https://youtube.com/channel/${content}` };
                case RewardConditionInteraction.TwitterLike:
                    return { url: `https://www.twitter.com/twitter/status/${content}` };
                case RewardConditionInteraction.TwitterRetweet:
                    return { url: `https://www.twitter.com/twitter/status/${content}` };
                case RewardConditionInteraction.TwitterFollow:
                    return { url: `https://www.twitter.com/i/user/${content}` };
                case RewardConditionInteraction.DiscordGuildJoined:
                    return { url: `${content}` }; // TODO We should ask for invite link in dashboard
                default:
                    return '';
            }
        },
        onClickSignin: function () {
            this.accountStore.api.userManager.cached.signinPopup();
        },
        onClickClaim: async function () {
            try {
                this.error = '';
                this.isSubmitting = true;
                await this.rewardsStore.claim(this.reward.uuid);
            } catch (error) {
                this.error = error;
            } finally {
                this.isSubmitting = false;
            }
        },
        onClickConnect: async function () {
            try {
                this.error = '';
                this.isSubmitting = true;

                await this.accountStore.api.userManager.cached.signinPopup({
                    extraQueryParams: {
                        channel: this.reward.platform,
                        prompt: 'connect',
                        return_url: WIDGET_URL + '/signin-popup.html',
                    },
                });
                await this.accountStore.getAccount();
            } catch (error) {
                this.error = error;
                await this.accountStore.getAccount();
            } finally {
                this.isSubmitting = false;
                this.error = '';
                // As window.opener is set to null right after redirect from auth.thx to Twitter
                // we currently update account info on an error as this might be caused by the
                // opener not being available in the popup. User will need to run the popup flow twice.
                await this.accountStore.getAccount();
            }
        },
    },
});
</script>
