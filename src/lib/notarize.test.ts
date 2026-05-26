import { expect } from "chai";
import { Wallet } from "ethers";

import {
  classifyDuplicateStatus,
  notarizeSubmissionSchema,
  resolveAttestationChainId,
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

  it("falls back to the configured chain id when block chain id is missing", () => {
    expect(
      resolveAttestationChainId({
        configuredChainId: 11155111,
        blockChainId: undefined
      })
    ).to.equal(11155111);
  });

  it("accepts the public display name opt-in flag in the submission schema", () => {
    expect(
      notarizeSubmissionSchema.parse({
        userId: "user-1",
        documentHash:
          "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578",
        walletAddress: "0x1234000000000000000000000000000000005678",
        authorizationMessage: "Authorize",
        authorizationSignature: "0x1234",
        authorizationDigest:
          "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578",
        fileName: "resume.pdf",
        fileType: "application/pdf",
        description: null,
        tags: ["Personal"],
        shareDisplayNamePublicly: false,
        nonce: "nonce-1"
      }).shareDisplayNamePublicly
    ).to.equal(false);
  });
});
