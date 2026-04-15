# Advanced Multi-wallet DApp

This workspace contains one Solidity contract and two frontends:

- `vanilla/` uses plain HTML, CSS, and Ethers.js.
- `react-app/` uses Vite, React, RainbowKit, wagmi, viem, and TanStack Query.
- `contracts/Greeting.sol` stores and updates a single greeting string.

## Install

```powershell
npm install
npm run react:install
```

## Localhost Flow

Terminal 1:

```powershell
npm run node
```

Terminal 2:

```powershell
npm run compile
npm run deploy:localhost
```

Terminal 3:

```powershell
npm run vanilla:dev
```

or:

```powershell
npm run react:dev
```

The deploy script updates `vanilla/contracts.config.json`, `react-app/public/contracts.json`, and `deployments/<network>.json`.

## Sepolia Flow

Create `.env` from `.env.example`, then add a Sepolia RPC URL and a funded Sepolia private key.

```powershell
Copy-Item .env.example .env
npm run deploy:sepolia
```

You need Sepolia test ETH for the deployer account. After deploy, the same frontend config files are updated automatically.

## WalletConnect

For the React app, copy `react-app/.env.example` to `react-app/.env` and replace the placeholder:

```powershell
Copy-Item react-app/.env.example react-app/.env
```

`VITE_WALLETCONNECT_PROJECT_ID` must come from WalletConnect Cloud for WalletConnect to work in production.

## Deployment

React on Vercel:

```powershell
npm run react:build
```

Set Vercel build settings:

- Root Directory: `advanced-web3-dapp/react-app`
- Build Command: `npm run build`
- Output Directory: `dist`

Vanilla on GitHub Pages:

- Deploy the `vanilla/` folder.
- Keep `contracts.config.json` beside `index.html`.

## Manual Verification

- Connect MetaMask, Coinbase Wallet, or another injected wallet.
- Reject one transaction and confirm the error state appears.
- Send a greeting update and confirm pending, success, tx hash, and refreshed greeting states.
- Switch between localhost and Sepolia after deploying to each network.
