import { network } from "hardhat";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type ContractConfig = {
  deployed: boolean;
  networkName: string;
  chainId: number;
  rpcUrl: string;
  explorerBaseUrl: string;
  deployedAt: string;
  contracts: {
    Greeting: {
      address: string;
      abi: unknown;
    };
  };
};

async function getArtifact(sourceName: string, contractName: string) {
  const artifactUrl = new URL(`../artifacts/contracts/${sourceName}/${contractName}.json`, import.meta.url);
  const artifactRaw = await readFile(artifactUrl, "utf8");
  return JSON.parse(artifactRaw);
}

async function writeJson(path: URL, data: ContractConfig) {
  await mkdir(new URL(".", path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const connection = await network.connect();
  const { ethers } = connection;
  const initialGreeting = process.env.INITIAL_GREETING ?? "Salom, Web3!";

  const greeting = await ethers.deployContract("Greeting", [initialGreeting]);
  await greeting.waitForDeployment();

  const address = await greeting.getAddress();
  const artifact = await getArtifact("Greeting.sol", "Greeting");
  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = Number(providerNetwork.chainId);
  const explorerBaseUrl = chainId === 11155111 ? "https://sepolia.etherscan.io" : "";
  const rpcUrl = chainId === 31337 ? "http://127.0.0.1:8545" : process.env.SEPOLIA_RPC_URL ?? "";

  const frontendConfig: ContractConfig = {
    deployed: true,
    networkName: connection.networkName,
    chainId,
    rpcUrl,
    explorerBaseUrl,
    deployedAt: new Date().toISOString(),
    contracts: {
      Greeting: {
        address,
        abi: artifact.abi,
      },
    },
  };

  await writeJson(new URL(`../deployments/${connection.networkName}.json`, import.meta.url), frontendConfig);
  await writeJson(new URL("../vanilla/contracts.config.json", import.meta.url), frontendConfig);
  await writeJson(new URL("../react-app/public/contracts.json", import.meta.url), frontendConfig);

  console.log(`Greeting deployed to: ${address}`);
  console.log(`Network: ${connection.networkName} (${chainId})`);
  console.log("Frontend config written to vanilla/contracts.config.json and react-app/public/contracts.json");

  await connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
