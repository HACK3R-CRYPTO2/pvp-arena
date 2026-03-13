import { ethers } from 'ethers';

/**
 * @title TxManager
 * @notice Centralizes transaction submission and manages nonces per wallet
 */
export class TxManager {
    private nonces: Map<string, number> = new Map();
    private locks: Map<string, Promise<void>> = new Map();

    /**
     * @notice Safely executes a transaction with synchronized nonce handling
     * @param wallet The ethers wallet to sign with
     * @param txRequest The transaction request
     * @returns The transaction response
     */
    public async sendTransaction(
        wallet: ethers.Wallet,
        txRequest: ethers.TransactionRequest
    ): Promise<ethers.TransactionResponse> {
        const address = await wallet.getAddress();
        
        // Wait for previous tx for this address to be submitted
        while (this.locks.get(address)) {
            await this.locks.get(address);
        }

        let release: () => void;
        const lock = new Promise<void>((resolve) => {
            release = resolve;
        });
        this.locks.set(address, lock);

        try {
            // Get current nonce
            let nonce = this.nonces.get(address);
            if (nonce === undefined) {
                nonce = await wallet.getNonce('pending');
            }

            const tx = await wallet.sendTransaction({
                ...txRequest,
                nonce
            });

            this.nonces.set(address, nonce + 1);
            return tx;
        } catch (error) {
            // On failure, reset local nonce to force re-sync from chain on next attempt
            this.resetNonce(address);
            throw error;
        } finally {
            this.locks.delete(address);
            release!();
        }
    }

    /**
     * @notice Resets the local nonce state for a wallet (e.g., on node failure)
     * @param address The wallet address
     */
    public resetNonce(address: string) {
        this.nonces.delete(address);
    }
}
