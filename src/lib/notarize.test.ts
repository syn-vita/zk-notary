import { expect } from "chai";
import { Wallet } from "ethers";

import {
  classifyDuplicateStatus,
  normalizeTags,
  verifyAuthorizationSignature
} from "./notarize.ts";

describe("notarize helpers", () => {
  it("classifies an existing attestation by the same wallet", () => {
    expect(
      classifyDuplicateStatus({
        attestationCount: 2,
        hasWalletAttested: true
      })
    ).to.equal("already-by-you");
  });

  it("classifies an existing attestation by other wallets", () => {
    expect(
      classifyDuplicateStatus({
        attestationCount: 2,
        hasWalletAttested: false
      })
    ).to.equal("already-by-others");
  });

  it("normalizes comma-separated tags into trimmed unique values", () => {
    expect(normalizeTags(" Legal, Academic,Legal , personal ")).to.deep.equal([
      "Legal",
      "Academic",
      "personal"
    ]);
  });

  it("verifies that a signed authorization message matches the claimed wallet", async () => {
    const wallet = Wallet.createRandom();
    const message = "Authorize this attestation";
    const signature = await wallet.signMessage(message);

    expect(
      verifyAuthorizationSignature({
        authorizationMessage: message,
        authorizationSignature: signature,
        walletAddress: wallet.address
      })
    ).to.equal(wallet.address);
  });

  it("rejects an authorization signature from a different wallet", async () => {
    const signer = Wallet.createRandom();
    const otherWallet = Wallet.createRandom();
    const signature = await signer.signMessage("Authorize this attestation");

    expect(() =>
      verifyAuthorizationSignature({
        authorizationMessage: "Authorize this attestation",
        authorizationSignature: signature,
        walletAddress: otherWallet.address
      })
    ).to.throw("Authorization signature does not match the selected wallet.");
  });
});
