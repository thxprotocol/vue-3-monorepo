<template>
    <b-form-group>
        <template #description>
            This reward requires a crypto wallet for your account.
            <b-link class="text-primary" @click="onClickAdd">Add a new wallet</b-link>
        </template>
        <b-form-select v-model="wallet" placeholder="Choose a wallet" @change="$emit('update', $event)">
            <b-form-select-option :value="null" disabled>Choose a wallet...</b-form-select-option>
            <b-form-select-option v-for="w in wallets" :value="w" :disabled="chainId ? chainId !== w.chainId : false">
                {{ w.short }}
                ({{ w.variant }})
            </b-form-select-option>
        </b-form-select>
    </b-form-group>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { chainList } from '../../utils/chains';
import { WalletVariant } from '../../types/enums/accountVariant';
import { useWalletStore } from '../../stores/Wallet';

export default defineComponent({
    name: 'BaseFormGroupUsername',
    props: {
        chainId: Number,
    },
    data() {
        return { chainList, wallet: null };
    },
    computed: {
        ...mapStores(useWalletStore),
        wallets() {
            return this.walletStore.wallets.filter((wallet: TWallet) =>
                [WalletVariant.Safe, WalletVariant.WalletConnect].includes(wallet.variant),
            );
        },
    },
    methods: {
        onClickAdd() {
            this.walletStore.isModalWalletCreateShown = true;
        },
    },
});
</script>
