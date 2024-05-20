import { Request, Response } from 'express';
import { query } from 'express-validator';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import ContractService from '@thxnetwork/api/services/ContractService';
import WalletService from '@thxnetwork/api/services/WalletService';

const validation = [query('walletId').isMongoId(), query('tokenAddress').isEthereumAddress()];

const controller = async (req: Request, res: Response) => {
    const walletId = req.query.walletId as string;
    const wallet = await WalletService.findById(walletId);
    if (!wallet) throw new NotFoundError('Wallet not found');

    const contract = ContractService.getContract(
        'THXERC20_LimitedSupply',
        wallet.chainId,
        req.query.tokenAddress as string,
    );
    const balance = await contract.balanceOf(wallet.address);

    res.json({ balanceInWei: balance.toString() });
};
export { controller, validation };