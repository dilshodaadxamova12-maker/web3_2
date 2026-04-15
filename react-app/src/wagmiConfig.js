import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const localhost = defineChain({
  id: 31337,
  name: "Hardhat Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_LOCALHOST_RPC_URL || "http://127.0.0.1:8545"],
    },
  },
});

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "replace-with-walletconnect-cloud-project-id";

const sepoliaTransport = import.meta.env.VITE_SEPOLIA_RPC_URL
  ? http(import.meta.env.VITE_SEPOLIA_RPC_URL)
  : http();

export const chains = [localhost, sepolia];

export const wagmiConfig = getDefaultConfig({
  appName: "Advanced Multi-wallet DApp",
  projectId: walletConnectProjectId,
  chains,
  transports: {
    [localhost.id]: http(import.meta.env.VITE_LOCALHOST_RPC_URL || "http://127.0.0.1:8545"),
    [sepolia.id]: sepoliaTransport,
  },
});
