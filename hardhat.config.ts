import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ?? process.env.SPONSOR_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test"
  },
  networks: {
    sepolia: {
      url: sepoliaRpcUrl ?? "",
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};

export default config;
