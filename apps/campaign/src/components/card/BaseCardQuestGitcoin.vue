<template>
    <BaseCardCollapse
        @modal-close="isModalQuestEntryShown = false"
        :quest="quest"
        :id="quest._id"
        :loading="isSubmitting"
        :completing="isModalQuestEntryShown"
        :amount="quest.amount"
        :error="error"
        :image="quest.image"
        :info-links="quest.infoLinks"
        :visible="!!authStore.oAuthShare && !quest.isClaimed"
    >
        <template #header>
            <div class="d-flex align-items-center justify-content-center" style="width: 25px">
                <i class="fas fa-fingerprint me-2 text-primary"></i>
            </div>
            <div class="flex-grow-1 pe-2">{{ quest.title }}</div>
            <div class="text-accent fw-bold">{{ quest.amount }}</div>
        </template>

        <b-alert class="p-2" v-model="isAlertDangerShown" variant="danger">
            <i class="fas fa-exclamation-circle me-1"></i> {{ error }}
        </b-alert>

        <b-card-text v-if="quest.description" style="white-space: pre-line" v-html="quest.description" />

        <blockquote class="d-flex align-items-center">
            <b-img :src="imgLogoGitcoin" class="ms-1 me-3" />
            <div>
                Your address is verified using Gitcoin's <code>Unique Humanity Scorer</code><br />
                <b-link target="_blank" href="https://passport.gitcoin.co">Create Gitcoin Passport</b-link>
            </div>
        </blockquote>

        <template #button>
            <b-button v-if="!authStore.oAuthShare" @click="onClickSignin" variant="primary" block class="w-100">
                Sign in &amp; claim <strong>{{ quest.amount }} points</strong>
            </b-button>

            <b-button v-else-if="quest.isClaimed" variant="primary" block class="w-100" disabled>
                Quest Completed
            </b-button>

            <b-button v-else-if="quest.isLocked" variant="primary" block class="w-100" disabled>
                <i class="fas fa-lock me-1" />
                Quest Locked
            </b-button>

            <b-button-group v-else class="w-100" block>
                <b-button variant="primary" block class="w-100" @click="onClickClaim">
                    <b-img
                        :src="chainList[chainId].logo"
                        class="me-2"
                        width="18"
                        height="18"
                        :alt="chainList[chainId].name"
                    />
                    Claim <strong>{{ quest.amount }}</strong> points
                </b-button>
                <b-dropdown end variant="primary" no-caret toggle-class="pe-3">
                    <template #button-content>
                        <i class="fas fa-caret-down"></i>
                    </template>
                    <BDropdownItem @click="chainId = contract.chainId" v-for="contract of quest.contracts">
                        <b-img
                            :src="chainList[contract.chainId].logo"
                            width="12"
                            height="12"
                            :alt="chainList[contract.chainId].name"
                            class="me-2"
                        />
                        {{ chainList[contract.chainId].name }}
                    </BDropdownItem>
                </b-dropdown>
            </b-button-group>
        </template>
    </BaseCardCollapse>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent, PropType } from 'vue';
import { useAccountStore } from '../../stores/Account';
import { useAuthStore } from '../../stores/Auth';
import { useRewardStore } from '../../stores/Reward';
import { getModal } from '../../utils/wallet-connect';
import { chainList, getAddressURL } from '../../utils/chains';
import { getAccount, GetAccountResult, PublicClient } from '@wagmi/core';
import { ChainId } from '@thxnetwork/sdk/src/lib/types/enums/ChainId';
import { signMessage } from '@wagmi/core';
import { Web3Modal } from '@web3modal/html';
import imgLogoGitcoin from '../../assets/gitcoin-logo.svg';

export default defineComponent({
    name: 'BaseCardQuestGitcoin',
    props: {
        quest: {
            type: Object as PropType<TQuestWeb3>,
            required: true,
        },
    },
    data(): {
        imgLogoGitcoin: string;
        account: GetAccountResult<PublicClient> | null;
        modal: Web3Modal | null;
        error: string;
        isModalOpen: boolean;
        isSubmitting: boolean;
        chainList: { [chainId: number]: ChainInfo };
        getAddressURL: any;
        show: boolean;
        chainId: ChainId;
        unsubscribe: any;
        isModalQuestEntryShown: boolean;
    } {
        return {
            imgLogoGitcoin,
            error: '',
            account: null,
            modal: null,
            isModalOpen: false,
            isSubmitting: false,
            chainList,
            getAddressURL,
            show: false,
            chainId: ChainId.Polygon,
            unsubscribe: null,
            isModalQuestEntryShown: false,
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useAuthStore),
        ...mapStores(useRewardStore),
        isAlertDangerShown() {
            return !!this.error && !this.isSubmitting;
        },
        accountStatus() {
            if (!this.account) return 'text-opaque';
            switch (this.account.status) {
                case 'connected':
                    return 'text-success';
                case 'connecting':
                    return 'text-warning';
                case 'disconnected':
                    return 'text-danger';
                default:
                    return 'text-opaque';
            }
        },
    },
    mounted() {
        if (this.quest.isClaimed) return;
        const chains = [chainList[ChainId.Polygon].chain];
        const theme = this.accountStore.getTheme();
        this.chainId = ChainId.Polygon;
        this.modal = getModal(chainList[this.chainId].chain, chains, theme);
        this.unsubscribe = this.modal.subscribeModal(this.onModalStateChange);
    },
    methods: {
        onModalStateChange({ open }: { open: boolean }) {
            this.isModalOpen = open;
            this.account = getAccount();
        },
        onClickSignin: function () {
            this.accountStore.signin();
        },
        waitForConnected() {
            return new Promise((resolve) => {
                setInterval(() => {
                    if (this.account?.isConnected) resolve('connected');
                }, 500);
            });
        },
        onClickClaim: async function () {
            if (!this.modal) return;

            this.error = '';
            this.isSubmitting = true;

            try {
                this.modal.setDefaultChain(this.chainList[this.chainId].chain);
                await this.modal.openModal();
                await this.waitForConnected();

                const message = `This signature will be used to proof ownership of a web3 account.`;
                const signature = await signMessage({ message });

                await this.rewardsStore.completeGitcoinQuest(this.quest.uuid, {
                    signature,
                    message,
                    chainId: this.chainId,
                });

                this.isModalQuestEntryShown = true;
            } catch (error) {
                this.error = error as string;
                this.modal.closeModal();
            } finally {
                this.isSubmitting = false;
            }
        },
    },
});
</script>