import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {App} from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Due to the latest Phantom Wallet update, in which the functionality to automatically confirm transactions was removed,
 * these adjustments are necessary to use the tool in a user-friendly way.
 */
// TODO: Connect wallet
// TODO: Upload distribution (json) file
// TODO: Calculate estimate costs and required token amount from distribution file
// TODO: Generate (or import) random keypair
// TODO: Display + copy / download generated random keypair
// TODO: Fund newly generated keypair from connected wallet (user has to approve only this transaction)
// TODO: Generate (random) spl-token (with 0 decimals & calculated amount)
// TODO: Send newly generated spl-token (from random keypair) to all wallets from distribution list
// TODO: Save transaction signature and wait for confirmation an each transaction
// TODO: Save transaction result to airdrop log file
// TODO: Rerun until all wallets from distribution file are funded
// TODO: Send remaining SOL to connected wallet
// TODO: Add ability to download random keypair (for later reruns)
// TODO: Add ability to download airdrop log (for later reruns)
// TODO: Add ability to add log file next to distribution file (to make reruns at any time possible)
// TODO: Add ability to split distribution list into multiple whitelists (with multiple spl-tokens)
// TODO: add ability to mint more spl-tokens from an already created spl-token (on reruns)
