import { defineStore } from 'pinia';
import { useAccountStore } from './Account';
import { track } from '../utils/mixpanel';

export const useRewardStore = defineStore('rewards', {
    state: (): TRewardState => ({
        rewards: [],
    }),
    actions: {
        async claimConditionalReward(uuid: string) {
            const { api, account, getBalance } = useAccountStore();
            const claim = await api.rewardsManager.points.claim(uuid);
            if (claim.error) {
                throw claim.error;
            } else {
                track.UserCreates(account?.sub, 'conditional reward claim');

                getBalance();

                const index = this.rewards.findIndex((r) => r.uuid === uuid);
                this.rewards[index].isClaimed = true;
            }
        },
        async claimMilestoneReward(reward: TMilestoneReward) {
            const { api, account, getBalance } = useAccountStore();
            const pendingClaims = reward.claims.filter((c) => !c.isClaimed);
            if (!pendingClaims.length) return;

            const uuid = pendingClaims[0].uuid;
            const claim = await api.rewardsManager.milestones.claim(uuid);

            if (claim.error) {
                throw claim.error;
            } else {
                track.UserCreates(account?.sub, 'milestone reward claim');

                getBalance();

                const index = this.rewards.findIndex((r: TMilestoneReward) => r.uuid === reward.uuid);
                const claimIndex = this.rewards[index].claims.findIndex((c: TMilestoneRewardClaim) => c.uuid === uuid);

                this.rewards[index].claims[claimIndex] = claim;
            }
        },
        async list() {
            const { api } = useAccountStore();
            const { referralRewards, pointRewards, milestoneRewards } = await api.rewardsManager.list();
            const referralRewardsList = Object.values(referralRewards).map((r: any) => {
                r.component = 'BaseCardRewardReferral';
                return r;
            });
            const milestoneRewardsList = Object.values(milestoneRewards).map((r: any) => {
                r.component = 'BaseCardRewardMilestone';
                return r;
            });
            const pointRewardsList = await Promise.all(
                Object.values(pointRewards).map(async (r: any) => {
                    r.component = 'BaseCardRewardPoints';
                    return r;
                }),
            );

            this.rewards = [...referralRewardsList, ...milestoneRewardsList, ...pointRewardsList];
        },
    },
});
