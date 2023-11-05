<template>
    <div
        :style="{
            minHeight: '100%',
            backgroundSize: 'cover',
            backgroundImage: `url(${imgBgOverlay})`,
        }"
        class="pt-3"
    >
        <b-container>
            <b-navbar toggleable="lg" type="dark" :container="false">
                <b-navbar-brand href="#" style="width: 120px">
                    <b-link to="/">
                        <b-img :src="imgLogo" height="50" alt="" />
                    </b-link>
                </b-navbar-brand>
                <b-button variant="link" v-b-toggle="'nav-collapse'" class="d-block d-lg-none">
                    <i class="fas fa-bars text-white"></i>
                </b-button>
                <b-collapse id="nav-collapse" is-nav class="pt-3">
                    <b-navbar-nav class="ms-auto">
                        <b-button
                            class="me-lg-3 mb-3 mb-lg-0 px-4"
                            variant="outline-light"
                            href="https://docs.thx.network"
                            target="_blank"
                        >
                            <i class="fas fa-graduation-cap me-1"></i>
                            Learn
                        </b-button>
                        <b-button class="me-lg-3 mb-3 mb-lg-0 px-4" variant="outline-light" to="/earn">
                            <i class="fas fa-rocket me-1"></i>
                            Earn
                        </b-button>
                    </b-navbar-nav>
                    <b-navbar-nav class="ms-auto mb-2 mb-lg-0 justify-content-end" style="width: 120px">
                        <template v-if="!authStore.user">
                            <b-button class="px-4" variant="primary" href="#" @click="accountStore.signin()">
                                Sign in
                                <i class="fas fa-sign-in-alt ms-2" />
                            </b-button>
                        </template>
                        <template v-else>
                            <b-nav-item-dropdown v-if="accountStore.account" end no-caret>
                                <template #button-content>
                                    <b-avatar variant="light" :src="accountStore.account.profileImg" />
                                </template>
                                <BDropdownItem @click="accountStore.isModalConnectSettingsShown = true">
                                    Profile
                                </BDropdownItem>
                                <BDropdownItem @click="walletStore.isModalWalletSettingsShown = true">
                                    Wallet
                                </BDropdownItem>
                                <BDropdownItem @click="authStore.signout()">Sign Out</BDropdownItem>
                            </b-nav-item-dropdown>
                            <b-spinner v-else variant="light" small />
                        </template>
                    </b-navbar-nav>
                </b-collapse>
            </b-navbar>
        </b-container>
        <router-view />
        <BaseFooter />
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import imgLogo from '../assets/logo.png';
import imgBgOverlay from '../assets/bg-overlay.png';
import { mapStores } from 'pinia';
import { useAccountStore } from '../stores/Account';
import { useAuthStore } from '../stores/Auth';
import { useWalletStore } from '../stores/Wallet';

export default defineComponent({
    name: 'Public',
    computed: {
        ...mapStores(useAccountStore),
        ...mapStores(useAuthStore),
        ...mapStores(useWalletStore),
    },
    data() {
        return {
            isModalConnectSettingsShown: false,
            isModalWalletSettingsShown: false,
            imgLogo,
            imgBgOverlay,
        };
    },
});
</script>
<style>
.gradient-shadow:before {
    content: '';
    position: absolute;
    inset: -15px; /* control the spread */
    z-index: -1; /* place the element behind */
    background: linear-gradient(-45deg, rgb(162, 0, 255), rgb(52, 17, 177));
    filter: blur(15px); /* control the blur */
}

.gradient-shadow-xl:before {
    content: '';
    position: absolute;
    inset: -35px; /* control the spread */
    z-index: -1; /* place the element behind */
    background: linear-gradient(-45deg, rgb(162, 0, 255), #5942c1, rgb(52, 17, 177));
    filter: blur(35px); /* control the blur */
    opacity: 0.75;
}
</style>