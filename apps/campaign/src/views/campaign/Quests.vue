<template>
    <BaseModalCampaignExpired :id="'modalCampaignExpiredRewards'" />
    <b-container class="flex-grow-1 overflow-auto order-lg-2">
        <b-row>
            <b-col lg="7" xl="6" offset-xl="1">
                <BaseQuestFilters
                    :filter="activeFilters"
                    :sort="selectedSort"
                    @change-filter="onChangeFilter"
                    @change-sort="onChangeSort"
                />
                <b-tabs content-class="mt-3" justified>
                    <b-tab active>
                        <template #title>
                            Available
                            <sup v-if="availableQuestCount">
                                <b-badge class="px-1 py-1" variant="danger">
                                    {{ availableQuestCount }}
                                </b-badge>
                            </sup>
                        </template>
                        <div :class="{ 'd-none': quest.isHidden }" :key="key" v-for="(quest, key) of available">
                            <component
                                v-if="quest"
                                :is="rewardComponentMap[quest.variant]"
                                :reward="quest"
                                class="mb-2 mx-lg-0 my-lg-3"
                            />
                        </div>
                        <div class="text-center mt-5" v-if="!availableQuestCount">
                            <i class="h1 fas fa-trophy text-accent" />
                            <p class="lead text-accent">Well done!</p>
                            <p class="text-opaque">You have completed all available quests</p>
                        </div>
                    </b-tab>
                    <b-tab title="Completed">
                        <div :class="{ 'd-none': !quest.isHidden }" :key="key" v-for="(quest, key) of available">
                            <component
                                :is="rewardComponentMap[quest.variant]"
                                :reward="quest"
                                class="mb-2 mx-lg-0 my-lg-3"
                            />
                        </div>
                    </b-tab>
                </b-tabs>
            </b-col>
            <b-col lg="5" xl="4">
                <BaseQuestLeaderboard />
            </b-col>
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useRewardStore } from '../../stores/Reward';
import { useAccountStore } from '../../stores/Account';
import BaseCardQuestInvite from '../../components/BaseCardQuestInvite.vue';
import BaseCardQuestSocial from '../../components/BaseCardQuestSocial.vue';
import BaseCardQuestCustom from '../../components/BaseCardQuestCustom.vue';
import BaseCardQuestDaily from '../../components/BaseCardQuestDaily.vue';
import BaseCardQuestWeb3 from '../../components/BaseCardQuestWeb3.vue';
import BaseModalCampaignExpired from '../../components/BaseModalCampaignExpired.vue';
import BaseQuestFilters from '../../components/BaseQuestFilters.vue';
import BaseQuestLeaderboard from '../../components/BaseQuestLeaderboard.vue';
import { useWalletStore } from '../../stores/Wallet';
import { usePerkStore } from '../../stores/Perk';
import { RewardSortVariant } from '../../types/enums/rewards';
import { filterAvailableMap, rewardComponentMap, sortMap } from '../../utils/quests';
import BaseModalQuestEntry from '../../components/BaseModalQuestEntry.vue';

export default defineComponent({
    name: 'Quests',
    components: {
        BaseQuestFilters,
        BaseQuestLeaderboard,
        BaseCardQuestInvite,
        BaseCardQuestSocial,
        BaseCardQuestCustom,
        BaseCardQuestDaily,
        BaseCardQuestWeb3,
        BaseModalCampaignExpired,
        BaseModalQuestEntry,
    },
    data(): any {
        return {
            rewardComponentMap,
            isLgScreen: window.innerWidth > 1000,
            selectedSort: { label: 'Default', key: RewardSortVariant.Default },
            activeFilters: [],
            isModalQuestEntryShown: false,
            entry: null,
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useRewardStore),
        ...mapStores(usePerkStore),
        ...mapStores(useWalletStore),
        isSubscribed() {
            const { subscription } = useAccountStore();
            return !!subscription;
        },
        isAlertSubscribeShown() {
            return !this.availableQuestCount;
        },
        availableQuestCount() {
            const { rewards } = useRewardStore();
            return rewards.filter((q: TBaseQuest) => filterAvailableMap[q.variant](q)).length;
        },
        available() {
            const { rewards } = useRewardStore();
            return rewards
                .map((q: TBaseQuest) => ({ ...q, isHidden: !filterAvailableMap[q.variant](q) }))
                .filter((q: TBaseQuest) =>
                    this.activeFilters.length
                        ? this.activeFilters.map((f: TQuestFilter) => f.key).includes(q.variant)
                        : true,
                )
                .sort(sortMap[this.selectedSort.key]);
        },
        completed() {
            const { rewards } = useRewardStore();
            return rewards
                .map((q: TBaseQuest) => ({ ...q, isHidden: filterAvailableMap[q.variant](q) }))
                .filter((q: TBaseQuest) =>
                    this.activeFilters.length
                        ? this.activeFilters.map((f: TQuestFilter) => f.key).includes(q.variant)
                        : true,
                )
                .sort(sortMap[this.selectedSort.key]);
        },
    },
    watch: {
        'availableQuestCount': {
            handler(amount: number) {
                // Return if not in iframe
                if (window.top === window.self) return;

                const { getConfig, poolId } = this.accountStore;
                // Send the amount of unclaimed rewards to the parent window and update the launcher
                window.top?.postMessage({ message: 'thx.reward.amount', amount }, getConfig(poolId).origin);
            },
            immediate: true,
        },
        // This redirects the user to the wallet of there are no rewards and perks
        'accountStore.isRewardsLoaded': {
            handler(isRewardsLoaded) {
                if (isRewardsLoaded && !this.rewardsStore.rewards.length && !this.perksStore.perks.length) {
                    this.$router.push(`/c/${this.accountStore.poolId}/wallet`);
                }
            },
            deep: true,
            immediate: true,
        },
    },
    methods: {
        onChangeFilter(filter: any) {
            const filterArr = Object.values(this.activeFilters);
            const filterIndex = filterArr.findIndex((f: any) => f.key == filter.key);
            this.activeFilters = filterIndex > -1 ? filterArr.splice(filterIndex, -1) : [...filterArr, filter];
        },
        onChangeSort(sort: any) {
            this.selectedSort = sort;
        },
    },
});
</script>
<style lang="scss">
.dropdown-item-filter {
    .form-check {
        padding: 0.15rem 0;
        padding-right: 1.5rem;
        &:hover {
            background-color: var(--bs-dropdown-link-hover-bg) !important;
        }
    }
    .form-check-input {
        float: right;
        margin-right: -1.25rem;
    }
    label {
        display: block;
        cursor: pointer;
        padding: 0 0.5rem;
    }
}
</style>