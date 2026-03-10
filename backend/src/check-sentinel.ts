import { ethers } from 'ethers';
import { CONFIG } from './config.js';

async function main() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
    const hook = new ethers.Contract(CONFIG.L2_HOOK_ADDRESS, ["function sentinel() view returns (address)"], provider);
    const sentinel = await hook.sentinel();
    console.log('--- SENTINEL STATUS ---');
    console.log(`Current Sentinel: ${sentinel}`);
}
main().catch(console.error);
