export const sortDailyRewards = (a: any, b: any) => {
    return a.claimAgainDuration ? 1 : b.claimAgainDuration ? 1 : -1;
};

export const sortConditionalRewards = (a: any, b: any) => {
    return (!!a.isClaimed as boolean) ? 1 : (!!b.isClaimed as boolean) ? 1 : -1;
};

export const sortMilestoneRewards = (a: any, b: any) => {
    const aNum = a.entries && a.entries.length - a.entries.filter((c: TQuestCustomClaim) => c.isClaimed).length;
    const bNum = b.entries && b.entries.length - b.entries.filter((c: TQuestCustomClaim) => c.isClaimed).length;
    return aNum - bNum > 0 ? -1 : bNum - aNum > 0 ? 1 : -1;
};

export const sortWeb3Rewards = (a: any, b: any) => {
    return (!!a.isClaimed as boolean) ? 1 : (!!b.isClaimed as boolean) ? 1 : -1;
};

export const sortGitcoinRewards = (a: any, b: any) => {
    return (!!a.isClaimed as boolean) ? 1 : (!!b.isClaimed as boolean) ? 1 : -1;
};
