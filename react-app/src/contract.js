export const GREETING_ABI = [
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

export const FALLBACK_CONTRACT_CONFIG = {
  deployed: false,
  networkName: "localhost",
  chainId: 31337,
  explorerBaseUrl: "",
  contracts: {
    Greeting: {
      address: "",
      abi: GREETING_ABI,
    },
  },
};
