import "@rainbow-me/rainbowkit/styles.css";
import "./styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";

import App from "./App.jsx";
import { wagmiConfig } from "./wagmiConfig.js";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#f0b35a",
            accentColorForeground: "#10140f",
            borderRadius: "large",
            fontStack: "rounded",
            overlayBlur: "small",
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
