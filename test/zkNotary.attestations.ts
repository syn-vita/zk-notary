import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("zkNotary attestation registry", () => {
  async function deployFixture() {
    const [deployer, relayer, alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("zkNotary");
    const registry = await factory.connect(deployer).deploy();

    return { registry, relayer, alice, bob };
  }

  it("records the attesting wallet separately from the relayer", async () => {
    const { registry, relayer, alice } = await deployFixture();
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("thesis.pdf"));
    const authorizationDigest = ethers.keccak256(
      ethers.toUtf8Bytes("alice authorization")
    );

    await expect(
      registry.connect(relayer).notarize(documentHash, alice.address, authorizationDigest)
    ).to.emit(registry, "DocumentAttested");

    expect(await registry.getAttestationCount(documentHash)).to.equal(1n);

    const attestation = await registry.getAttestation(documentHash, 0);
    expect(attestation.attestor).to.equal(alice.address);
    expect(attestation.relayer).to.equal(relayer.address);
    expect(attestation.authorizationDigest).to.equal(authorizationDigest);
    expect(attestation.timestamp).to.be.greaterThan(0n);
    expect(await registry.hasWalletAttested(documentHash, alice.address)).to.equal(true);
  });

  it("allows multiple wallets to attest the same hash", async () => {
    const { registry, relayer, alice, bob } = await deployFixture();
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("evidence.docx"));

    await registry
      .connect(relayer)
      .notarize(documentHash, alice.address, ethers.keccak256(ethers.toUtf8Bytes("alice")));
    await registry
      .connect(relayer)
      .notarize(documentHash, bob.address, ethers.keccak256(ethers.toUtf8Bytes("bob")));

    expect(await registry.getAttestationCount(documentHash)).to.equal(2n);
    expect(await registry.hasWalletAttested(documentHash, alice.address)).to.equal(true);
    expect(await registry.hasWalletAttested(documentHash, bob.address)).to.equal(true);
  });

  it("rejects duplicate attestations from the same wallet for the same hash", async () => {
    const { registry, relayer, alice } = await deployFixture();
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("contract.pdf"));
    const authorizationDigest = ethers.keccak256(
      ethers.toUtf8Bytes("signed consent")
    );

    await registry.connect(relayer).notarize(documentHash, alice.address, authorizationDigest);

    await expect(
      registry.connect(relayer).notarize(documentHash, alice.address, authorizationDigest)
    ).to.be.revertedWith("Attestation already exists for wallet");
  });
});
