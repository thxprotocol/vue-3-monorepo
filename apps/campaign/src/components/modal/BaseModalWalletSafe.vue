<template>
    <b-modal :id="id" v-model="isShown" centered hide-footer @hidden="isShown = false" @show="onShow">
        <template #header>
            <h5 class="modal-title"><i class="fas fa-wallet me-2"></i> Safe Multisig</h5>
            <b-link class="btn-close" @click="isShown = false">
                <i class="fas fa-times"></i>
            </b-link>
        </template>
        <b-alert v-if="error" show variant="danger" class="p-2">{{ error }}</b-alert>

        <b-form>
            <div v-if="!privateKey" class="d-flex w-100 justify-content-center py-5">
                <b-spinner small />
            </div>

            <b-form-group v-else label="Private Key">
                <b-input-group>
                    <b-form-input v-model="privateKey" disabled />
                    <b-input-group-append>
                        <b-button size="sm" variant="primary" @click="isPrivateKeyHidden = !isPrivateKeyHidden">
                            <i v-if="isPrivateKeyHidden" class="fas fa-eye px-2"></i>
                            <i v-else class="fas fa-eye-slash px-2"></i>
                        </b-button>
                        <b-button
                            v-clipboard:copy="authStore.privateKey"
                            v-clipboard:success="onCopySuccess"
                            size="sm"
                            variant="primary"
                        >
                            <i v-if="isCopied" class="fas fa-clipboard-check px-2"></i>
                            <i v-else class="fas fa-clipboard px-2"></i>
                        </b-button>
                    </b-input-group-append>
                </b-input-group>
                <template #description>
                    <p class="text-opaque my-1 mb-0">
                        This private key is partially derived from your login and used for confirmation of your
                        multi-sigs transactions. Key shares: {{ currentKeyTreshold }}
                    </p>
                </template>
            </b-form-group>

            <template v-if="authStore.securityQuestion">
                <label class="mb-2">Security Question</label>

                <b-form-group>
                    <b-form-input v-model="question" placeholder="Question" />
                    <template #description>
                        <p class="text-opaque my-1 mb-0">
                            This question will be asked once when using this wallet on another device to recover your
                            private key.
                        </p>
                    </template>
                </b-form-group>
                <b-form-group :state="isPasswordValid" :invalid-feedback="'Use 10 or more characters'">
                    <b-form-input
                        v-model="password"
                        :state="isPasswordValid"
                        type="password"
                        placeholder="Answer"
                        autocomplete="off"
                    />
                </b-form-group>
                <b-form-group :state="isPasswordValid" :invalid-feedback="'Use 10 or more characters'">
                    <b-form-input
                        v-model="passwordCheck"
                        :state="isPasswordValid"
                        type="password"
                        placeholder="Answer again"
                        autocomplete="off"
                    />
                </b-form-group>
                <b-button
                    :disabled="!isPasswordValid || !authStore.isDeviceShareAvailable"
                    class="w-100"
                    variant="primary"
                    @click="onSubmitDeviceSharePasswordUpdate"
                >
                    <b-spinner v-if="isLoadingPasswordChange" small variant="light" />
                    <template v-else> Change Security Question </template>
                </b-button>
            </template>
        </b-form>
    </b-modal>
</template>

<script lang="ts">
import { useAuthStore } from '../../stores/Auth';
import { useAccountStore } from '../../stores/Account';
import { useWalletStore, walletLogoMap } from '../../stores/Wallet';
import { useQuestStore } from '../../stores/Quest';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { WalletVariant } from '../../types/enums/accountVariant';
import { chainList } from '../../utils/chains';

export default defineComponent({
    name: 'BaseModalWallet',
    props: {
        id: String,
        wallet: { type: Object, required: true },
    },
    data() {
        return {
            isShown: false,
            walletLogoMap,
            chainList,
            WalletVariant,
            error: '',
            isCopied: false,
            isPrivateKeyHidden: true,
            question: '',
            password: '',
            passwordCheck: '',
            isLoadingReset: false,
            isLoadingPasswordChange: false,
        };
    },
    computed: {
        ...mapStores(useAccountStore, useAuthStore, useQuestStore, useWalletStore),
        privateKey() {
            if (this.isPrivateKeyHidden && this.authStore.privateKey.length) {
                return this.authStore.privateKey.replace(/./g, '•');
            }
            return this.authStore.privateKey;
        },
        currentKeyTreshold() {
            const { oAuthShare, isDeviceShareAvailable, isSecurityQuestionAvailable } = useAuthStore();

            let i = 0;
            if (oAuthShare) i++;
            if (isDeviceShareAvailable) i++;
            if (isSecurityQuestionAvailable) i++;

            return `${i}/3`;
        },
        isPasswordValid: function () {
            if (this.password.length >= 10 && this.password === this.passwordCheck) return true;
            if (this.password.length && this.password.length < 10) return false;
            return undefined;
        },
    },
    watch: {
        show(show: boolean) {
            this.isShown = show;
        },
    },
    methods: {
        async onShow() {
            this.password = '';
            this.passwordCheck = '';

            if (!this.authStore.privateKey) {
                await this.authStore.getPrivateKey();
            }

            this.question = this.authStore.securityQuestion;
        },
        onCopySuccess() {
            this.isCopied = true;
        },
        async onSubmitDeviceSharePasswordUpdate() {
            const { oAuthShare, isDeviceShareAvailable, updateDeviceShare } = this.authStore;
            if (!oAuthShare || !isDeviceShareAvailable) return;

            this.isLoadingPasswordChange = true;
            await updateDeviceShare(this.password, this.question);
            this.isLoadingPasswordChange = false;
            this.password = '';
            this.passwordCheck = '';
        },
        async onSubmitResetAccount() {
            this.isLoadingReset = true;
            await this.authStore.reset();
            this.isLoadingReset = false;
        },
    },
});
</script>
