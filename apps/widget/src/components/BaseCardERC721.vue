<template>
    <b-card body-class="d-flex align-items-center" class="m-2">
        <div class="pe-3">
            <img height="25" :src="token.logoImg" />
        </div>
        <div class="flex-grow-1">
            <strong>{{ token.erc721.name }} #{{ token.tokenId }}</strong>
        </div>
        <div class="text-success fw-bold">{{ token.erc721.symbol }}</div>
    </b-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
    name: 'BaseCardERC721',
    props: {
        token: {
            type: Object as PropType<TERC721>,
            required: true,
        },
    },
});
</script>
