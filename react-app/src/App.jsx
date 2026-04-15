import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isAddress } from "viem";

import { FALLBACK_CONTRACT_CONFIG, GREETING_ABI } from "./contract.js";

const explorerByChain = {
  11155111: "https://sepolia.etherscan.io",
};

function truncate(value, start = 8, end = 6) {
  if (!value) return "";
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function normalizeError(error) {
  return error?.shortMessage || error?.message || "Something went wrong.";
}

export default function App() {
  const [runtimeConfig, setRuntimeConfig] = useState(FALLBACK_CONTRACT_CONFIG);
  const [contractAddress, setContractAddress] = useState(
    () => localStorage.getItem("react:greetingAddress") || "",
  );
  const [nextGreeting, setNextGreeting] = useState("");
  const [txHash, setTxHash] = useState("");
  const [formError, setFormError] = useState("");

  const { isConnected } = useAccount();
  const activeChainId = useChainId();
  const switchChain = useSwitchChain();
  const writeContract = useWriteContract();

  const greetingConfig = runtimeConfig.contracts?.Greeting ?? {
    address: "",
    abi: GREETING_ABI,
  };
  const abi = greetingConfig.abi?.length ? greetingConfig.abi : GREETING_ABI;
  const targetChainId = runtimeConfig.chainId || activeChainId;
  const hasContract = isAddress(contractAddress);
  const wrongNetwork = Boolean(isConnected && targetChainId && activeChainId !== targetChainId);

  const explorerBase = runtimeConfig.explorerBaseUrl || explorerByChain[targetChainId] || "";
  const txUrl = txHash && explorerBase ? `${explorerBase}/tx/${txHash}` : "";

  const greetingRead = useReadContract({
    address: hasContract ? contractAddress : undefined,
    abi,
    functionName: "getGreeting",
    chainId: targetChainId,
    query: {
      enabled: hasContract,
      refetchInterval: txHash ? 2500 : false,
    },
  });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash || undefined,
    chainId: targetChainId,
    confirmations: 1,
  });

  const status = useMemo(() => {
    if (writeContract.isPending) {
      return {
        tone: "pending",
        title: "Confirm in wallet",
        message: "Your wallet is waiting for approval.",
      };
    }

    if (receipt.isLoading) {
      return {
        tone: "pending",
        title: "Transaction pending",
        message: "Waiting for the transaction receipt.",
      };
    }

    if (receipt.isSuccess) {
      return {
        tone: "success",
        title: "Greeting updated",
        message: `Confirmed in block ${receipt.data?.blockNumber?.toString() ?? "latest"}.`,
      };
    }

    if (writeContract.isError || receipt.isError || formError) {
      return {
        tone: "error",
        title: "Action failed",
        message: formError || normalizeError(writeContract.error || receipt.error),
      };
    }

    return null;
  }, [
    formError,
    receipt.data?.blockNumber,
    receipt.error,
    receipt.isError,
    receipt.isLoading,
    receipt.isSuccess,
    writeContract.error,
    writeContract.isError,
    writeContract.isPending,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadContracts() {
      try {
        const response = await fetch("/contracts.json", { cache: "no-store" });
        if (!response.ok) return;

        const nextConfig = await response.json();
        if (cancelled) return;

        setRuntimeConfig(nextConfig);
        const configuredAddress = nextConfig.contracts?.Greeting?.address;
        const savedAddress = localStorage.getItem("react:greetingAddress");
        if (!savedAddress && configuredAddress) {
          setContractAddress(configuredAddress);
        }
      } catch {
        if (!cancelled) setRuntimeConfig(FALLBACK_CONTRACT_CONFIG);
      }
    }

    loadContracts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (receipt.isSuccess) {
      setNextGreeting("");
      greetingRead.refetch();
    }
  }, [greetingRead, receipt.isSuccess]);

  function handleAddressChange(event) {
    const nextAddress = event.target.value.trim();
    setContractAddress(nextAddress);
    localStorage.setItem("react:greetingAddress", nextAddress);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    writeContract.reset();
    setTxHash("");

    if (!hasContract) {
      setFormError("Deploy the contract or paste a valid Greeting contract address.");
      return;
    }

    if (!isConnected) {
      setFormError("Connect a wallet before sending a transaction.");
      return;
    }

    if (!nextGreeting.trim()) {
      setFormError("Greeting cannot be empty.");
      return;
    }

    try {
      if (wrongNetwork) {
        await switchChain.switchChainAsync({ chainId: targetChainId });
      }

      const hash = await writeContract.writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "setGreeting",
        args: [nextGreeting.trim()],
        chainId: targetChainId,
      });

      setTxHash(hash);
    } catch (error) {
      setFormError(normalizeError(error));
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">React + RainbowKit + Wagmi</p>
          <h1>Production-style wallet UX for one simple contract.</h1>
          <p className="hero-copy">
            Connect MetaMask, Coinbase, Safe, WalletConnect, or another supported wallet, then
            read and update the Greeting contract with live transaction state.
          </p>
        </div>
        <ConnectButton />
      </section>

      <section className="grid">
        <article className="panel contract-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Contract state</p>
              <h2>Greeting</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => greetingRead.refetch()} disabled={!hasContract}>
              Refresh
            </button>
          </div>

          <label className="field">
            <span>Contract address</span>
            <input
              value={contractAddress}
              onChange={handleAddressChange}
              placeholder="Deploy first or paste a Greeting address"
            />
          </label>

          <div className="readout">
            <span>Current greeting</span>
            <strong>
              {!hasContract
                ? "No contract address"
                : greetingRead.isLoading
                  ? "Loading..."
                  : greetingRead.isError
                    ? "Read failed"
                    : greetingRead.data || "Empty greeting"}
            </strong>
          </div>

          {greetingRead.isError ? <p className="inline-error">{normalizeError(greetingRead.error)}</p> : null}

          <form onSubmit={handleSubmit} className="write-form">
            <label className="field">
              <span>New greeting</span>
              <input
                value={nextGreeting}
                onChange={(event) => setNextGreeting(event.target.value)}
                placeholder="Write a new message"
              />
            </label>

            {wrongNetwork ? (
              <p className="network-warning">Connected to chain {activeChainId}. This contract expects {targetChainId}.</p>
            ) : null}

            <button
              className="primary-button"
              type="submit"
              disabled={writeContract.isPending || receipt.isLoading || !nextGreeting.trim()}
            >
              {writeContract.isPending ? "Check wallet" : receipt.isLoading ? "Confirming" : "Send transaction"}
            </button>
          </form>
        </article>

        <aside className="panel meta-panel">
          <p className="eyebrow">Runtime config</p>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>{runtimeConfig.networkName || "Manual"}</dd>
            </div>
            <div>
              <dt>Target chain</dt>
              <dd>{targetChainId || "Unknown"}</dd>
            </div>
            <div>
              <dt>Contract</dt>
              <dd>{hasContract ? truncate(contractAddress) : "Not deployed"}</dd>
            </div>
            <div>
              <dt>Config source</dt>
              <dd>{runtimeConfig.deployed ? "Deploy script" : "Placeholder"}</dd>
            </div>
          </dl>

          {status ? (
            <div className={`status-card ${status.tone}`}>
              <span>{status.tone === "success" ? "OK" : status.tone === "error" ? "!" : "..."}</span>
              <div>
                <h3>{status.title}</h3>
                <p>{status.message}</p>
                {txUrl ? (
                  <a href={txUrl} target="_blank" rel="noreferrer">
                    View transaction
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="status-card neutral">
              <span>i</span>
              <div>
                <h3>Ready for testing</h3>
                <p>Reject a transaction to see error handling, or send one to see pending and success states.</p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
