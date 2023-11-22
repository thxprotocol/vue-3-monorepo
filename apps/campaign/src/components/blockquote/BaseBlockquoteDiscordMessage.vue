<template>
    <blockquote>
        <b-alert variant="warning" show v-model="isAlertDiscordShown" class="p-2 px-3">
            <i class="fas fa-exclamation-circle me-1" />
            Connect a Discord account for this quest
        </b-alert>
        <p class="text-opaque mb-2"><strong>Your points</strong></p>
        <b-progress class="bg-primary mb-2" height="12px" :max="reward.amount">
            <b-progress-bar variant="success" show-value :value="reward.pointsClaimed" />
            <b-progress-bar variant="warning" :value="accountStore.account ? reward.pointsAvailable : 0" />
        </b-progress>
        <p class="text-opaque mb-1 d-flex justify-content-between">
            <b-col>
                <p class="mb-0">
                    <strong>Message Limit</strong><br />
                    - Max. {{ reward.contentMetadata.limit }}/day<br />
                    - Max. {{ reward.contentMetadata.days * reward.contentMetadata.limit }}/{{
                        reward.contentMetadata.limit
                    }}
                    days
                </p>
            </b-col>
            <b-col class="flex-grow-1">
                <strong>Limit Reset</strong><br />
                - In
                {{
                    reward.restartDates &&
                    formatDistance(new Date(reward.restartDates.now), new Date(reward.restartDates.end), {
                        addSuffix: false,
                    })
                }}
                (Quest)<br />
                - In
                {{
                    reward.restartDates &&
                    formatDistance(new Date(reward.restartDates.now), new Date(reward.restartDates.endDay), {
                        addSuffix: false,
                    })
                }}
                (Day)
            </b-col>
        </p>
        <b-button @click="visible = !visible" variant="link" class="text-white text-opaque w-100 text-center">
            {{ visible ? 'Hide' : 'View' }} Discord activity
            <i class="fas ms-2" :class="{ 'fa-caret-down': !visible, 'fa-caret-up': visible }" />
        </b-button>
        <b-collapse v-model="visible" class="mt-2">
            <BarChart :height="120" :chartData="chartData" :options="options" />
        </b-collapse>
    </blockquote>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { formatDistance, format } from 'date-fns';
import { Chart, registerables } from 'chart.js';
import { BarChart } from 'vue-chart-3';
import { useAccountStore } from '../../stores/Account';
import { mapStores } from 'pinia';
import { AccessTokenKind } from '../../types/enums/accessTokenKind';

Chart.register(...registerables);

export default defineComponent({
    name: 'BaseBlockquoteDiscordMessage',
    components: {
        BarChart,
    },
    props: {
        reward: {
            type: Object as PropType<TQuestSocial>,
            required: true,
        },
    },
    data(): any {
        return {
            format,
            formatDistance,
            visible: false,
            options: {
                scales: {
                    y: {
                        display: false,
                    },
                    x: {
                        display: false,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                elements: {
                    bar: {
                        borderRadius: 2,
                    },
                },
            },
        };
    },
    computed: {
        ...mapStores(useAccountStore),
        isAlertDiscordShown() {
            if (!this.accountStore.account) return false;
            const connectedAccount = this.accountStore.account.connectedAccounts.find(
                ({ kind }) => kind === AccessTokenKind.Discord,
            );
            return !connectedAccount;
        },
        chartData() {
            if (!this.reward.restartDates || !this.reward.messages) return;
            let currentDate = new Date(this.reward.restartDates.start);
            const endDate = new Date(this.reward.restartDates.end);
            const group: any = {};

            while (currentDate.getTime() <= endDate.getTime()) {
                const day = currentDate.toISOString().split('T')[0]; // Extract YYYY-MM-DD
                group[day] = [];
                currentDate.setDate(currentDate.getDate() + 1);
            }
            for (const message of this.reward.messages) {
                const day = new Date(message.createdAt).toISOString().split('T')[0];
                group[day] = group[day] || [];
                group[day].push(message);
            }

            const labels = Object.keys(group).map((date: string) => format(new Date(date), 'MMM dd'));
            const data = Object.values(group).map((messages: any) => messages.length);
            const theme = JSON.parse(this.accountStore.config.theme);

            return {
                labels,
                datasets: [{ data, backgroundColor: Object.values(group).map(() => theme.colors.accent.color) }],
            };
        },
    },
});
</script>
<style scoped>
a {
    text-decoration: none;
}
</style>