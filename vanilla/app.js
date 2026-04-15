const GREETING_ABI = [
  {
    inputs: [{ internalType: "string", name: "initialGreeting", type: "string" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "updatedBy", type: "address" },
      { indexed: false, internalType: "string", name: "oldGreeting", type: "string" },
      { indexed: false, internalType: "string", name: "newGreeting", type: "string" },
    ],
    name: "GreetingChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "getGreeting",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "greeting",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "newGreeting", type: "string" }],
    name: "setGreeting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const FALLBACK_CONFIG = {
  deployed: false,
  networkName: "localhost",
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  explorerBaseUrl: "",
  contracts: {
    Greeting: {
      address: "",
      abi: GREETING_ABI,
    },
  },
};

const explorerByChain = {
  11155111: "https://sepolia.etherscan.io",
};

const state = {
  account: "",
  browserProvider: null,
  chainId: null,
  config: FALLBACK_CONFIG,
  contractAddress: localStorage.getItem("vanilla:greetingAddress") ?? "",
  injectedProvider: null,
  signer: null,
  walletLabel: "",
};

const providerRegistry = new Map();

const els = {
  accountAddress: document.querySelector("#accountAddress"),
  connectBtn: document.querySelector("#connectBtn"),
  contractAddress: document.querySelector("#contractAddress"),
  contractState: document.querySelector("#contractState"),
  currentGreeting: document.querySelector("#currentGreeting"),
  modal: document.querySelector("#walletModal"),
  networkName: document.querySelector("#networkName"),
  newGreeting: document.querySelector("#newGreeting"),
  refreshBtn: document.querySelector("#refreshBtn"),
  sendBtn: document.querySelector("#sendBtn"),
  statusIcon: document.querySelector("#statusIcon"),
  statusMsg: document.querySelector("#statusMsg"),
  statusPanel: document.querySelector("#statusPanel"),
  statusTitle: document.querySelector("#statusTitle"),
  txLink: document.querySelector("#txLink"),
  walletInfo: document.querySelector("#walletInfo"),
  walletType: document.querySelector("#walletType"),
};

function truncate(value, start = 6, end = 4) {
  if (!value) return "";
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function normalizeError(error) {
  return error?.shortMessage || error?.reason || error?.message || "Something went wrong.";
}

function registerProvider(provider, info = {}) {
  if (!provider) return;
  const key = info.uuid || info.rdns || info.name || provider.id || provider;
  providerRegistry.set(key, { provider, info });
}

function registerLegacyProviders() {
  const ethereum = window.ethereum;
  if (!ethereum) return;

  if (Array.isArray(ethereum.providers)) {
    ethereum.providers.forEach((provider, index) => {
      registerProvider(provider, {
        name: provider.isMetaMask ? "MetaMask" : provider.isCoinbaseWallet ? "Coinbase Wallet" : `Injected ${index + 1}`,
        rdns: provider.isMetaMask ? "io.metamask" : provider.isCoinbaseWallet ? "com.coinbase.wallet" : `injected.${index}`,
      });
    });
    return;
  }

  registerProvider(ethereum, {
    name: ethereum.isMetaMask ? "MetaMask" : ethereum.isCoinbaseWallet ? "Coinbase Wallet" : "Injected Wallet",
    rdns: ethereum.isMetaMask ? "io.metamask" : ethereum.isCoinbaseWallet ? "com.coinbase.wallet" : "injected",
  });
}

function setupEip6963Discovery() {
  window.addEventListener("eip6963:announceProvider", (event) => {
    registerProvider(event.detail.provider, event.detail.info);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function findProvider(type) {
  const providers = Array.from(providerRegistry.values());

  if (type === "metamask") {
    return providers.find(({ provider, info }) => provider.isMetaMask || info.rdns?.includes("metamask"));
  }

  if (type === "coinbase") {
    return providers.find(({ provider, info }) => provider.isCoinbaseWallet || info.rdns?.includes("coinbase"));
  }

  return (
    providers.find(({ provider, info }) => {
      const isMetaMask = provider.isMetaMask || info.rdns?.includes("metamask");
      const isCoinbase = provider.isCoinbaseWallet || info.rdns?.includes("coinbase");
      return !isMetaMask && !isCoinbase;
    }) ?? providers[0]
  );
}

function getWalletLabel(provider, info = {}) {
  if (provider.isCoinbaseWallet || info.rdns?.includes("coinbase")) return "Coinbase";
  if (provider.isMetaMask || info.rdns?.includes("metamask")) return "MetaMask";
  return info.name || "Injected";
}

async function loadConfig() {
  try {
    const response = await fetch("contracts.config.json", { cache: "no-store" });
    if (response.ok) {
      state.config = await response.json();
    }
  } catch {
    state.config = FALLBACK_CONFIG;
  }

  const configuredAddress = state.config.contracts?.Greeting?.address ?? "";
  if (!state.contractAddress && configuredAddress) {
    state.contractAddress = configuredAddress;
  }

  els.contractAddress.value = state.contractAddress;
  updateContractUi();
  await refreshGreeting();
}

function updateWalletUi() {
  if (!state.account) {
    els.walletInfo.classList.add("hidden");
    els.connectBtn.textContent = "Connect Wallet";
    els.networkName.textContent = state.config.networkName
      ? `${state.config.networkName} (${state.config.chainId})`
      : "Not connected";
    return;
  }

  els.walletInfo.classList.remove("hidden");
  els.accountAddress.textContent = truncate(state.account);
  els.walletType.textContent = state.walletLabel;
  els.connectBtn.textContent = "Change Wallet";
  els.networkName.textContent = `Chain ${state.chainId}`;
}

function updateContractUi() {
  const hasAddress = ethers.isAddress(state.contractAddress);
  els.contractState.textContent = hasAddress ? truncate(state.contractAddress, 8, 6) : "Deploy or paste address";
  els.sendBtn.disabled = !hasAddress || !state.account || !els.newGreeting.value.trim();
}

function setStatus(type, title, message, txHash = "") {
  els.statusPanel.className = `status-panel status-${type}`;
  els.statusPanel.classList.remove("hidden");
  els.statusTitle.textContent = title;
  els.statusMsg.textContent = message;
  els.txLink.classList.add("hidden");
  els.txLink.removeAttribute("href");

  if (type === "pending") {
    els.statusIcon.className = "spinner";
    els.statusIcon.textContent = "";
  } else {
    els.statusIcon.className = "status-icon-static";
    els.statusIcon.textContent = type === "success" ? "OK" : "!";
  }

  const explorer = state.config.explorerBaseUrl || explorerByChain[state.chainId] || explorerByChain[state.config.chainId];
  if (txHash && explorer) {
    els.txLink.href = `${explorer}/tx/${txHash}`;
    els.txLink.textContent = "View on explorer";
    els.txLink.classList.remove("hidden");
  }
}

async function getReadContract() {
  if (!ethers.isAddress(state.contractAddress)) return null;

  const abi = state.config.contracts?.Greeting?.abi ?? GREETING_ABI;

  if (state.signer) {
    return new ethers.Contract(state.contractAddress, abi, state.signer);
  }

  if (state.browserProvider) {
    return new ethers.Contract(state.contractAddress, abi, state.browserProvider);
  }

  if (state.config.rpcUrl) {
    const provider = new ethers.JsonRpcProvider(state.config.rpcUrl);
    return new ethers.Contract(state.contractAddress, abi, provider);
  }

  return null;
}

async function refreshGreeting() {
  updateContractUi();

  if (!ethers.isAddress(state.contractAddress)) {
    els.currentGreeting.textContent = "No contract address";
    return;
  }

  try {
    els.currentGreeting.textContent = "Loading...";
    const contract = await getReadContract();
    if (!contract) {
      els.currentGreeting.textContent = "Connect wallet or add RPC config";
      return;
    }

    const greeting = await contract.getGreeting();
    els.currentGreeting.textContent = greeting;
  } catch (error) {
    els.currentGreeting.textContent = "Read failed";
    setStatus("error", "Read Error", normalizeError(error));
  }
}

async function connectWallet(type) {
  const match = findProvider(type);
  if (!match) {
    setStatus("error", "Wallet Not Found", "Install or unlock the selected wallet extension, then try again.");
    return;
  }

  try {
    state.injectedProvider = match.provider;
    state.walletLabel = getWalletLabel(match.provider, match.info);

    const accounts = await match.provider.request({ method: "eth_requestAccounts" });
    state.browserProvider = new ethers.BrowserProvider(match.provider, "any");
    state.signer = await state.browserProvider.getSigner();
    state.account = accounts[0] ?? (await state.signer.getAddress());

    const network = await state.browserProvider.getNetwork();
    state.chainId = Number(network.chainId);

    match.provider.on?.("accountsChanged", (accountsChanged) => {
      state.account = accountsChanged[0] ?? "";
      if (!state.account) {
        state.signer = null;
      }
      updateWalletUi();
      updateContractUi();
    });

    match.provider.on?.("chainChanged", async () => {
      const nextNetwork = await state.browserProvider.getNetwork();
      state.chainId = Number(nextNetwork.chainId);
      updateWalletUi();
      await refreshGreeting();
    });

    els.modal.classList.add("hidden");
    updateWalletUi();
    updateContractUi();
    await refreshGreeting();
  } catch (error) {
    setStatus("error", "Connection Failed", normalizeError(error));
  }
}

async function switchToContractNetwork() {
  if (!state.injectedProvider || !state.config.chainId || state.chainId === state.config.chainId) {
    return;
  }

  await state.injectedProvider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: ethers.toBeHex(state.config.chainId) }],
  });
}

async function sendGreeting() {
  const nextGreeting = els.newGreeting.value.trim();
  if (!nextGreeting || !ethers.isAddress(state.contractAddress)) return;

  if (!state.signer) {
    setStatus("error", "Wallet Required", "Connect a wallet before sending a transaction.");
    return;
  }

  try {
    els.sendBtn.disabled = true;
    await switchToContractNetwork();

    const abi = state.config.contracts?.Greeting?.abi ?? GREETING_ABI;
    const contract = new ethers.Contract(state.contractAddress, abi, state.signer);

    setStatus("pending", "Confirm in Wallet", "Your wallet is waiting for approval.");
    const tx = await contract.setGreeting(nextGreeting);

    setStatus("pending", "Transaction Pending", "Waiting for block confirmation...", tx.hash);
    const receipt = await tx.wait();

    setStatus("success", "Greeting Updated", `Confirmed in block ${receipt.blockNumber}.`, tx.hash);
    els.newGreeting.value = "";
    await refreshGreeting();
  } catch (error) {
    setStatus("error", "Transaction Failed", normalizeError(error));
  } finally {
    updateContractUi();
  }
}

function bindEvents() {
  els.connectBtn.addEventListener("click", () => els.modal.classList.remove("hidden"));
  document.querySelector(".close-modal").addEventListener("click", () => els.modal.classList.add("hidden"));
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) els.modal.classList.add("hidden");
  });

  document.querySelectorAll(".wallet-option").forEach((button) => {
    button.addEventListener("click", () => connectWallet(button.dataset.wallet));
  });

  els.contractAddress.addEventListener("input", () => {
    state.contractAddress = els.contractAddress.value.trim();
    localStorage.setItem("vanilla:greetingAddress", state.contractAddress);
    updateContractUi();
  });

  els.contractAddress.addEventListener("change", refreshGreeting);
  els.newGreeting.addEventListener("input", updateContractUi);
  els.refreshBtn.addEventListener("click", refreshGreeting);
  els.sendBtn.addEventListener("click", sendGreeting);
}

async function init() {
  setupEip6963Discovery();
  registerLegacyProviders();
  bindEvents();
  updateWalletUi();
  await loadConfig();
}

init();
