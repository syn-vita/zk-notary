import { expect } from "chai";

import type { PublicAttestationRecord } from "./domain.ts";
import {
  buildCertificateExportName,
  buildCertificatePrintTitle
} from "./certificate.ts";

const record: PublicAttestationRecord = {
  attestationRef:
    "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4",
  documentHash:
    "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578",
  attestingWallet: "0x1234000000000000000000000000000000005678",
  chainId: 11155111,
  networkName: "Sepolia",
  txHash: "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
  logIndex: 4,
  status: "active",
  publicSupersededNote: null,
  notarizedAt: "2026-05-26T12:00:00.000Z"
};

describe("certificate helpers", () => {
  it("builds a stable print title from the attestation reference", () => {
    expect(buildCertificatePrintTitle(record)).to.equal(
      "zkNotary Certificate - eip155_11155111_0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231_4"
    );
  });

  it("builds a proof-only export file name", () => {
    expect(buildCertificateExportName(record)).to.equal(
      "zknotary-certificate-eip155_11155111_0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231_4.pdf"
    );
  });
});
