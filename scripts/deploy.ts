import hardhat from "hardhat";

const { ethers, network } = hardhat;

async function main() {
  if (network.name !== "sepolia") {
    throw new Error("Deploy this contract with the Sepolia network selected.");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer is available. Check your env configuration.");
  }

  console.log(`Deploying zkNotary with ${deployer.address} on ${network.name}...`);

  const registryFactory = await ethers.getContractFactory("zkNotary");
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`zkNotary deployed to: ${contractAddress}`);
  console.log("");
  console.log("Next step:");
  console.log(`Set NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress} in .env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
