import { THXClient } from '@thxnetwork/sdk';
import { defineStore } from 'pinia';
import { API_URL } from '../config/secrets';
import { usePerkStore } from './Perk';
import { useRewardStore } from './Reward';
import { useWalletStore } from './Wallet';
import { track } from '@thxnetwork/mixpanel';
import { getStyles } from '../utils/theme';
import { useAuthStore } from './Auth';
import { getAccessTokenKindForPlatform, getConnectionStatus } from '../utils/social';
import { RewardConditionPlatform } from '../types/enums/rewards';
import { User } from 'oidc-client-ts';
import { getIsMobile } from '../utils/user-agent';
import { AccountVariant } from '../types/enums/accountVariant';
import poll from 'promise-poller';

export const useAccountStore = defineStore('account', {
    state: (): TAccountState => ({
        poolId: '',
        api: null,
        account: null,
        balance: 0,
        migration: null,
        subscription: null,
        isAuthenticated: null,
        isRewardsLoaded: false,
        isEthereumBrowser: window.ethereum && window.matchMedia('(pointer:coarse)').matches, // Feature only available on mobile devices
    }),
    actions: {
        getConfig: (poolId: string): TWidgetConfig => {
            const data = localStorage.getItem(`thx:widget:${poolId}:config`);
            if (!data) return {} as TWidgetConfig;
            return JSON.parse(data);
        },
        setConfig(poolId: string, config: TWidgetConfig) {
            const data = { ...this.getConfig(poolId), ...config };
            localStorage.setItem(`thx:widget:${poolId}:config`, JSON.stringify(data));
            this.poolId = poolId;
        },
        setTheme(config: TWidgetConfig) {
            const { title, theme } = config;
            const { elements, colors } = JSON.parse(theme);
            const sheet = getStyles(elements, colors);

            document.title = title;
            document.head.appendChild(sheet);
        },
        async init(poolId: string, origin?: string) {
            const authStore = useAuthStore();

            this.api = new THXClient({ url: API_URL, accessToken: '', poolId });
            this.poolId = poolId;
            this.isAuthenticated = false;

            const data = await this.api.request.get('/v1/widget/' + poolId);

            this.setConfig(this.poolId, { ...data, origin });
            this.setTheme(data);
            this.getUserData();

            authStore.userManager.events.addUserLoaded(this.onUserLoaded);
            authStore.userManager.events.addUserUnloaded(this.onUserUnloaded);
            authStore.userManager.events.load(this.onLoad);
            authStore
                .getUser()
                .then(() => {
                    if (!authStore.user) {
                        this.isAuthenticated = null;
                    }
                })
                .catch((error) => {
                    this.isAuthenticated = null;
                    console.error(error);
                });

            track('UserVisits', [
                this.account?.sub || '',
                'page with widget',
                { origin: this.getConfig(poolId).origin, poolId },
            ]);

            if (window.top === window.self) {
                const { origin } = this.getConfig(this.poolId);
                track('UserOpens', [this.account?.sub || '', `widget iframe`, { origin, poolId, isShown: true }]);
            }

            if (origin) {
                window.top?.postMessage({ message: 'thx.widget.ready' }, origin);
            }
        },
        onLoad() {
            // debugger;
        },
        async onUserLoaded(user: User) {
            const authStore = useAuthStore();
            await authStore.onUserLoadedCallback(user);
            authStore.getPrivateKey();

            this.api.setAccessToken(user.access_token);
            this.getUserData();
        },
        onUserUnloaded() {
            return useAuthStore().onUserUnloadedCallback();
        },
        updateLauncher() {
            const rewardsStore = useRewardStore();
            const amount = rewardsStore.rewards.filter((r) => !r.isClaimed).length;
            const { origin } = this.getConfig(this.poolId);

            // Return if not in iframe
            if (window.top === window.self) return;

            // Send the amount of unclaimed rewards to the parent window and update the launcher
            window.top?.postMessage({ message: 'thx.reward.amount', amount }, origin);
        },
        async getAccount() {
            const { chainId } = this.getConfig(this.poolId);
            // this.account = await this.api.account.get(chainId);
            this.account = await this.api.request.get('/v1/account' + (chainId && `?chainId=${chainId}`));
        },
        async getBalance() {
            const { balance } = await this.api.pointBalance.list();
            this.balance = balance;
        },
        async subscribe(email: string) {
            this.subscription = await this.api.pools.subscription.post({ poolId: this.poolId, email });

            const { origin } = this.getConfig(this.poolId);
            track('UserCreates', [this.account?.sub, 'pool subscription', { poolId: this.poolId, origin }]);
        },
        async unsubscribe() {
            this.subscription = await this.api.pools.subscription.delete(this.poolId);

            const { origin } = this.getConfig(this.poolId);
            track('UserCreates', [this.account?.sub, 'pool unsubscription', { poolId: this.poolId, origin }]);
        },
        async getSubscription() {
            this.subscription = await this.api.pools.subscription.get(this.poolId);
        },
        connect(platform: RewardConditionPlatform) {
            return useAuthStore().requestOAuthShare({
                prompt: 'connect',
                channel: String(platform),
                access_token_kind: String(getAccessTokenKindForPlatform(platform)),
            });
        },
        waitForConnectionStatus(platform: RewardConditionPlatform) {
            const taskFn = async () => {
                if (!this.account) return;
                await this.getAccount();

                return getConnectionStatus(this.account, platform)
                    ? Promise.resolve()
                    : Promise.reject('Could no validate connection status...');
            };
            return poll({
                taskFn,
                interval: 3000,
                retries: 20, // 3s * 20 = 60s
            });
        },
        signin(extraQueryParams?: { [key: string]: string }) {
            this.isAuthenticated = false;
            return useAuthStore().requestOAuthShare(extraQueryParams);
        },
        async signout() {
            const authStore = useAuthStore();
            if (!authStore.user) return;

            const isMobile = getIsMobile();
            await authStore.userManager[isMobile ? 'signoutRedirect' : 'signoutPopup']({
                state: { isMobile, origin: window.location.href },
                id_token_hint: authStore.user.id_token,
            });
        },
        async migrate() {
            await this.api.request.post('/v1/account/wallet/migrate');
        },
        async getWalletMigration() {
            this.migration = await this.api.request.get('/v1/account/wallet/migrate');
        },
        async getUserData() {
            const rewardsStore = useRewardStore();
            const perksStore = usePerkStore();
            const walletStore = useWalletStore();
            const { oAuthShare } = useAuthStore();
            const { origin } = this.getConfig(this.poolId);

            rewardsStore.list().then(() => {
                const amount = rewardsStore.rewards.filter((r) => !r.isClaimed).length;

                // Send the amount of unclaimed rewards to the parent window and update the launcher
                if (window.self !== window.top) {
                    window.top?.postMessage({ message: 'thx.reward.amount', amount }, origin);
                }

                this.isRewardsLoaded = true;
            });
            perksStore.list();

            // Guard HTTP requests that do require auth
            if (!oAuthShare) return;

            await this.getAccount().then(async () => {
                if (!this.account || this.account.variant === AccountVariant.Metamask) return;

                // Patch the account with the MPC address
                const authRequestMessage = 'validate_account_address_ownership';
                const authRequestSignature = await useAuthStore().sign(authRequestMessage);

                await this.api.account.patch(JSON.stringify({ authRequestMessage, authRequestSignature }));
            });

            this.isAuthenticated = true;
            track('UserSignsIn', [this.account, { origin, poolId: this.poolId }]);

            await Promise.all([this.getBalance(), this.getSubscription(), walletStore.list(), walletStore.getWallet()]);
        },
    },
});