import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { serverEnv } from "@/lib/env";

export const zkNotaryAbi = [
  "event DocumentAttested(bytes32 indexed documentHash, bytes32 indexed attestationId, address indexed attestor, address relayer, bytes32 authorizationDigest, uint256 timestamp)",
  "function notarize(bytes32 documentHash, address attestor, bytes32 authorizationDigest) returns (bytes32 attestationId)",
  "function getAttestationCount(bytes32 documentHash) view returns (uint256)",
  "function getAttestation(bytes32 documentHash, uint256 index) view returns (tuple(address attestor, address relayer, bytes32 authorizationDigest, uint64 timestamp))",
  "function hasWalletAttested(bytes32 documentHash, address attestor) view returns (bool)"
] as const;

export function getRegistryConfig() {
  if (
    !serverEnv.SEPOLIA_RPC_URL ||
    !serverEnv.SPONSOR_PRIVATE_KEY ||
    !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  ) {
    return null;
  }

  return {
    rpcUrl: serverEnv.SEPOLIA_RPC_URL,
    sponsorPrivateKey: serverEnv.SPONSOR_PRIVATE_KEY,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  };
}

export function getReadContract() {
  const config = getRegistryConfig();
  if (!config) {
    return null;
  }

  const provider = new JsonRpcProvider(config.rpcUrl);
  return new Contract(config.contractAddress, zkNotaryAbi, provider);
}

export function getWriteContract() {
  const config = getRegistryConfig();
  if (!config) {
    return null;
  }

  const provider = new JsonRpcProvider(config.rpcUrl);
  const signer = new Wallet(config.sponsorPrivateKey, provider);
  return new Contract(config.contractAddress, zkNotaryAbi, signer);
}
