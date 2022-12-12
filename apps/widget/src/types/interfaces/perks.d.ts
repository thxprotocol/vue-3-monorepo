type TPerkState = {
    perks: any[];
};

type TPerk = {
    uuid: string;
    title: string;
    description: string;
    pointPrice: number;
    isOwned: boolean;
    metadata: { attributes: { key: string; value: string }[] };
};
