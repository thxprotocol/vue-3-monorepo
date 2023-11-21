import { defineStore } from 'pinia';
import { CLIENT_ID, CLIENT_SECRET, WIDGET_URL, AUTH_URL, VERIFIER_ID, API_URL } from '../config/secrets';
import { useClaimStore } from './Claim';
import { tKey } from '../utils/tkey';
import { useAccountStore } from './Account';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { getIsMobile } from '../utils/user-agent';
import { Wallet } from '@ethersproject/wallet';
import { track } from '@thxnetwork/mixpanel';
import poll from 'promise-poller';
// import { worker } from '../utils/worker';
// console.log(worker);

const userManager = new UserManager({
    authority: AUTH_URL,
    resource: API_URL,
    response_type: 'code',
    response_mode: 'query',
    redirect_uri: WIDGET_URL + '/signin-popup.html',
    silent_redirect_uri: WIDGET_URL + '/signin-silent.html',
    post_logout_redirect_uri: WIDGET_URL + '/signout-popup.html',
    popup_post_logout_redirect_uri: WIDGET_URL + '/signout-popup.html',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    automaticSilentRenew: false,
    loadUserInfo: false,
    prompt: 'consent',
    scope: 'openid offline_access account:read account:write erc20:read erc721:read erc1155:read point_balances:read referral_rewards:read point_rewards:read wallets:read wallets:write pool_subscription:read pool_subscription:write claims:read',
    userStore: new WebStorageStateStore({ store: window.localStorage }),
});

export const useAuthStore = defineStore('auth', {
    state: (): TAuthState => ({
        user: null,
        userManager: userManager as UserManager,
        wallet: null,
        privateKey: '',
        oAuthShare: '',
        securityQuestion: '',
        isDeviceShareAvailable: null,
        isSecurityQuestionAvailable: null,
    }),
    actions: {
        async onUserLoadedCallback(user: User) {
            if (!user.access_token || !user.id_token) return;

            const requestConfig = {
                verifier: VERIFIER_ID,
                clientId: CLIENT_ID,
                typeOfLogin: 'jwt',
                enableLogging: false,
                hash: `#state=state&access_token=${user?.access_token}&id_token=${user?.id_token}`,
                queryParameters: new URLSearchParams({ code: '', iss: AUTH_URL, state: 'state' } as any).toString(),
                jwtParams: {
                    domain: AUTH_URL,
                    accessToken: user?.access_token,
                    idToken: user?.id_token,
                    user_info_route: 'me',
                },
            };
            await this.triggerLogin(requestConfig);
        },
        onUserUnloadedCallback() {
            this.oAuthShare = '';
        },
        async requestOAuthShare(extraQueryParams?: { [key: string]: string }) {
            const { poolId, config } = useAccountStore();
            const { claim } = useClaimStore();
            const isMobile = getIsMobile();
            const returnUrl = window.location.href;

            this.user = await this.userManager[isMobile ? 'signinRedirect' : 'signinPopup']({
                state: {
                    isMobile,
                    returnUrl,
                    client_id: CLIENT_ID,
                    origin: config.origin,
                },
                extraQueryParams: {
                    return_url: returnUrl,
                    pool_id: poolId,
                    claim_id: claim ? claim.uuid : '',
                    ...extraQueryParams,
                },
            }).catch((error: Error) => {
                console.log(error);

                if (error.message === 'Popup closed by user') {
                    // Should start polling in order to check if auth flow is completed
                    // We should poll the signin silent request until a user becomes available (Twitter throws this after loosing window.top)
                    // Its problematic that the user also could have closed it on purpose
                    this.waitForUser();
                }

                // Should refresh because issue could be caused by base64 state string in redirect
                if (error.message === 'No matching state found in storage') {
                    this.requestOAuthShareRefresh();
                }
            });
        },
        waitForUser() {
            const taskFn = async () => {
                await this.requestOAuthShareRefresh();
                return this.user ? Promise.resolve() : Promise.reject('Could not find an authenticated user...');
            };
            poll({ taskFn, interval: 5000, retries: 60 });
        },
        async signout() {
            const isMobile = getIsMobile();
            await this.userManager[isMobile ? 'signoutRedirect' : 'signoutPopup']({
                state: { isMobile, origin: window.location.href },
                id_token_hint: this.user?.id_token,
            })
                .then(() => {
                    this.user = null;
                })
                .catch((error: Error) => {
                    console.log(error);
                    if (error.message === 'Popup closed by user') {
                        this.user = null;
                    }
                });
        },
        async requestOAuthShareRefresh() {
            const { config } = useAccountStore();

            if (this.user && this.user.expired) {
                this.user = null;
            }

            this.user = await this.userManager
                .signinSilent({
                    state: {
                        returnUrl: window.location.href,
                        client_id: CLIENT_ID,
                        origin: config.origin,
                    },
                })
                .catch((error: Error) => {
                    console.log(error);
                    // Should signout because refresh token is no longer valid or auth is required
                    if (['grant request is invalid', 'End-User authentication is required'].includes(error.message)) {
                        this.signout();
                    }
                });
        },
        async triggerLogin(requestConfig: any) {
            await tKey.serviceProvider.init({ skipSw: true });
            await tKey.modules.securityQuestions.initialize();

            // Trigger login with access and id token hash
            const loginResponse = await tKey.serviceProvider.triggerLogin(requestConfig);
            this.oAuthShare = loginResponse.oAuthKeyData.privKey;

            await tKey.initialize();
        },
        async getUser() {
            // Validate user token expiry
            this.user = await this.userManager.getUser();
            if (!this.user) return;
            if (this.oAuthShare) return;

            await this.requestOAuthShareRefresh();
        },
        async getPrivateKey() {
            if (!this.oAuthShare) return;
            await this.getDeviceShare();
            this.getSecurityQuestion();

            if (!this.isDeviceShareAvailable) return;
            this.reconstructKey();
        },
        async sign(message: string) {
            if (!this.wallet) return;
            return await this.wallet.signMessage(message);
        },
        async reset() {
            await this.resetKey();
            await useAccountStore().signout();
        },
        async resetKey() {
            // WARNING Irreversible
            await tKey.storageLayer.setMetadata({
                privKey: this.oAuthShare as any,
                input: { message: 'KEY_NOT_FOUND' },
            });
        },
        async reconstructKey() {
            const { requiredShares } = tKey.getKeyDetails();
            if (requiredShares <= 0) {
                const reconstructedKey = await tKey.reconstructKey();
                this.privateKey = `0x${reconstructedKey?.privKey.toString('hex').padStart(64, '0')}`;
                this.wallet = new Wallet(this.privateKey);
                console.debug('Successfully reconstructed private key.');
            }
        },
        async getDeviceShare() {
            try {
                await tKey.modules.webStorage.inputShareFromWebStorage(); // 2/2 flow
                this.isDeviceShareAvailable = true;
                console.debug('Successfully asserted device share.');
            } catch (error: unknown) {
                this.isDeviceShareAvailable = false;
                console.log(error);
            }
        },
        async getSecurityQuestion() {
            try {
                this.securityQuestion = await tKey.modules.securityQuestions.getSecurityQuestions();
                this.isSecurityQuestionAvailable = true;
                console.debug('Successfully got security question.');
            } catch (error) {
                this.isSecurityQuestionAvailable = false;
                console.log(error);
            }
        },
        async createDeviceShare(question: string, answer: string) {
            const { account, poolId } = useAccountStore();

            try {
                await tKey.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer, question);
                await this.getSecurityQuestion();

                console.debug('Successfully generated new share with password.');

                track('UserCreates', [
                    account?.sub || '',
                    `security question`,
                    { poolId, address: this.wallet.address, hasPrivateKey: !!this.privateKey },
                ]);
            } catch (error) {
                track('UserCreates', [
                    account?.sub || '',
                    `security question error`,
                    {
                        poolId,
                        address: this.wallet.address,
                        hasPrivateKey: !!this.privateKey,
                        error: (error as Error).toString(),
                    },
                ]);
                console.log(error);
            }
        },
        async updateDeviceShare(answer: string, question: string) {
            await tKey.modules.securityQuestions.changeSecurityQuestionAndAnswer(answer, question);
            await this.getSecurityQuestion();
            console.debug('Successfully changed new share with password.');
        },
        async recoverDeviceShare(value: string) {
            await tKey.modules.securityQuestions.inputShareFromSecurityQuestions(value); // 2/2 flow
            await this.reconstructKey();

            const newShare = await tKey.generateNewShare();
            const shareStore = tKey.outputShareStore(newShare.newShareIndex);

            await tKey.modules.webStorage.storeDeviceShare(shareStore);
            await this.getDeviceShare();

            console.debug('Successfully logged you in with the recovery password.');
        },
    },
});
