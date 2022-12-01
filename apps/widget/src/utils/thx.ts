import { THXClient } from '@thxnetwork/sdk';
import { WIDGET_URL, CLIENT_ID, CLIENT_SECRET } from '../config/secrets';

export const thx = new THXClient({
    env: 'local',
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUrl: WIDGET_URL,
    scopes: 'openid account:read point_balances:read',
});
