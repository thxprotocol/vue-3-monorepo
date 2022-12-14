<template>
    <div class="d-flex flex-column h-100">
        <b-navbar
            class="navbar-top pt-3"
            :style="{
                backgroundImage: activeTheme.class === 'thx-default' ? `url(${require('./assets/bg-planet.png')})` : '',
            }"
        >
            <div style="width: 75px">
                <b-button variant="link" @click="onClickClose"> <i class="fas fa-times"></i></b-button>
            </div>
            <div class="pl-3 py-2 text-center" v-if="accountStore.isAuthenticated">
                <div class="text-success h1 m-0">
                    <strong>{{ accountStore.balance }}</strong>
                </div>
                <div>points</div>
            </div>
            <div>
                <b-button variant="link" size="sm" @click="onClickTheme">
                    <i v-if="activeTheme.class === 'thx-light'" class="fas fa-moon"></i>
                    <i v-if="activeTheme.class === 'thx-default'" class="fas fa-sun"></i>
                </b-button>
                <b-button variant="link" v-if="!accountStore.isAuthenticated" @click="onClickSignin">
                    Sign in
                </b-button>
                <b-dropdown variant="link" v-else no-caret right>
                    <template #button-content>
                        <i class="fas fa-bars"></i>
                    </template>
                    <b-dropdown-item-button
                        v-if="walletStore.wallet"
                        size="sm"
                        v-clipboard:copy="walletStore.wallet.address"
                    >
                        <div class="d-flex align-items-center justify-content-between">
                            {{ walletAddress }}
                            <i class="fas fa-clipboard ml-auto"></i>
                        </div>
                    </b-dropdown-item-button>
                    <b-dropdown-item-button size="sm" @click="onClickAccount">
                        <div class="d-flex align-items-center justify-content-between">
                            Account
                            <i class="fas fa-user ml-auto"></i>
                        </div>
                    </b-dropdown-item-button>
                    <b-dropdown-divider />
                    <b-dropdown-item-button size="sm" @click="accountStore.api.userManager.cached.signoutPopup()">
                        <div class="d-flex align-items-center justify-content-between">
                            Signout
                            <i class="fas fa-sign-out-alt ml-auto"></i>
                        </div>
                    </b-dropdown-item-button>
                </b-dropdown>
            </div>
        </b-navbar>
        <router-view />
        <b-navbar class="navbar-bottom">
            <router-link to="/" class="d-flex flex-column justify-content-center align-items-center">
                <i class="fas fa-trophy"></i>
                Points
            </router-link>
            <router-link to="/perks" class="d-flex flex-column justify-content-center align-items-center">
                <i class="fas fa-store"></i>
                Perks
            </router-link>
            <router-link to="/wallet" class="d-flex flex-column justify-content-center align-items-center">
                <i class="fas fa-wallet"></i>
                Wallet
            </router-link>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { WIDGET_URL, GTM } from './config/secrets';
import { useAccountStore } from './stores/Account';
import { useRewardStore } from './stores/Reward';
import { useWalletStore } from './stores/Wallet';
import { initGTM } from './utils/ga';

type TTheme = { class: string; name: string; label: string };

const themeList = [
    {
        label: 'Light',
        name: 'light',
        class: 'thx-light',
    },
    {
        label: 'Dark',
        name: 'dark',
        class: 'thx-default',
    },
];

export default defineComponent({
    data() {
        return {
            themes: themeList,
            activeTheme: themeList[0],
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useRewardStore),
        ...mapStores(useWalletStore),
        walletAddress() {
            const { wallet } = useWalletStore();
            if (!wallet) return '';
            return `${wallet.address.substring(0, 6)}...${wallet.address.substring(
                wallet.address.length - 4,
                wallet.address.length,
            )}`;
        },
    },
    async created() {
        if (GTM) initGTM();
        // this.$route is not yet available at this point so we use the browser location API
        // to obtain the query
        const params = new URLSearchParams(window.location.search);
        const [id, origin, chainId, theme] = ['id', 'origin', 'chainId', 'theme'].map((key) => params.get(key));

        await this.accountStore.init({ id, origin, chainId, theme });

        window.onmessage = this.onMessage;

        this.setTheme();
        this.ready();
    },
    methods: {
        setTheme() {
            const { theme } = this.accountStore.getConfig(this.accountStore.poolId);
            this.activeTheme = themeList.find((t) => t.name === theme) as TTheme;
            document.body.classList.add(this.activeTheme.class);
        },
        ready() {
            const { origin } = this.accountStore.getConfig(this.accountStore.poolId);
            window.top?.postMessage({ message: 'thx.widget.ready' }, origin);
        },
        async onMessage(event: MessageEvent) {
            const { getConfig, setConfig, poolId, api, getBalance } = this.accountStore;
            const config = getConfig(this.accountStore.poolId);
            if (!WIDGET_URL || event.origin !== new URL(config.origin).origin) return;
            switch (event.data.message) {
                case 'thx.referral.claim.create': {
                    const { ref } = getConfig(poolId);
                    if (ref) {
                        await api.rewardsManager.referral.claim({ ...event.data, sub: ref });
                        setConfig(poolId, { ref: '' } as TWidgetConfig);
                        getBalance();
                    }
                    break;
                }
                case 'thx.config.ref': {
                    setConfig(poolId, { ref: event.data.sub } as TWidgetConfig);
                    break;
                }
            }
        },
        onClickSignin() {
            this.accountStore.api.userManager.cached.signinPopup();
        },
        onClickClose() {
            const { origin } = this.accountStore.getConfig(this.accountStore.poolId);
            window.top?.postMessage({ message: 'thx.widget.close' }, origin);
        },
        onClickAccount() {
            this.accountStore.api.userManager.cached.signinRedirect({
                extraQueryParams: {
                    prompt: 'account-settings',
                    return_url: window.location.href,
                },
            });
        },
        onClickTheme() {
            switch (this.activeTheme.class) {
                case themeList[0].class:
                    document.body.classList.remove(this.activeTheme.class);
                    document.body.classList.add(themeList[1].class);
                    this.activeTheme = themeList[1];
                    break;
                case themeList[1].class:
                    document.body.classList.remove(this.activeTheme.class);
                    document.body.classList.add(themeList[0].class);
                    this.activeTheme = themeList[0];
                    break;
            }
            this.accountStore.setTheme(this.activeTheme.name);
        },
    },
});
</script>

<style lang="scss" src="./scss/default/default.theme.scss"></style>
<style lang="scss" src="./scss/light/light.theme.scss"></style>
