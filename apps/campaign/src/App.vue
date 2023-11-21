<template>
    <div id="main">
        <router-view />
        <BaseModalWalletCreate />
        <BaseModalWalletRecovery />
        <BaseModalAccount size="lg" />
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { GTM } from './config/secrets';
import { initGTM } from './utils/ga';
import { mapStores } from 'pinia';
import { useAuthStore } from './stores/Auth';
import { useAccountStore } from './stores/Account';
import { useWalletStore } from './stores/Wallet';
import './scss/main.scss';

export default defineComponent({
    data() {
        return {
            isModalConnectSettingsShown: false,
            isModalAccountShown: false,
            isModalWalletCreateShown: false,
            isModalWalletRecoveryShown: false,
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useAuthStore),
        ...mapStores(useWalletStore),
    },
    watch: {
        // OAuthshare retrieved but device share and security quesiton not found
        'authStore.isSecurityQuestionAvailable'(isSecurityQuestionAvailable) {
            const { oAuthShare, isDeviceShareAvailable } = this.authStore;
            if (!oAuthShare) return;

            this.walletStore.isModalWalletCreateShown =
                (isDeviceShareAvailable && !(isSecurityQuestionAvailable ?? false)) ||
                (!isDeviceShareAvailable && !(isSecurityQuestionAvailable ?? false));
            this.walletStore.isModalWalletRecoveryShown =
                !isDeviceShareAvailable && (isSecurityQuestionAvailable ?? false);

            // Achieved 3/3, let's patch account address and deploy Safe!
            if (isDeviceShareAvailable && isSecurityQuestionAvailable) {
                this.accountStore
                    .updateAccountAddress()
                    .then(() => this.walletStore.getWallet())
                    .catch(console.error);
            }
        },
    },
    async created() {
        if (GTM) initGTM();
    },
});
</script>
