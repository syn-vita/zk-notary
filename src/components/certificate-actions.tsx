"use client";

import { useState } from "react";

import type { PublicAttestationRecord } from "@/lib/domain";
import {
  buildCertificateExportName,
  buildCertificatePrintTitle
} from "@/lib/certificate";

type CertificateActionsProps = {
  record: PublicAttestationRecord;
  variant: "certificate" | "receipt";
};

function buildPrintDocument(record: PublicAttestationRecord, variant: "certificate" | "receipt") {
  const title = buildCertificatePrintTitle(record);
  const subtitle =
    variant === "certificate"
      ? "Proof-only public certificate"
      : "Proof-only attestation receipt";
  const supersededBlock =
    record.status === "superseded" && record.publicSupersededNote
      ? `<div class="notice"><strong>Superseded context</strong><p>${record.publicSupersededNote}</p></div>`
      : "";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        body { font-family: "Segoe UI", sans-serif; margin: 40px; color: #0f172a; }
        h1 { margin: 0 0 8px; font-size: 28px; }
        h2 { margin: 0 0 20px; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase; color: #1d4ed8; }
        p { line-height: 1.6; }
        dl { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
        .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; background: #f8fafc; }
        dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #475569; }
        dd { margin: 8px 0 0; word-break: break-all; font-size: 14px; }
        .notice { margin-top: 24px; border: 1px solid #f59e0b; background: #fffbeb; border-radius: 16px; padding: 16px; }
        .footer { margin-top: 28px; font-size: 12px; color: #475569; }
      </style>
    </head>
    <body>
      <h2>${subtitle}</h2>
      <h1>${title}</h1>
      <p>This document confirms that zkNotary recorded a wallet-authorized attestation for a file hash on Ethereum Sepolia. It does not by itself prove authorship, truthfulness, or legal enforceability.</p>
      <dl>
        ${[
          ["Attestation reference", record.attestationRef],
          ["Document hash", record.documentHash],
          ["Wallet", record.attestingWallet],
          ["Recorded at", new Date(record.notarizedAt).toLocaleString()],
          ["Network", `${record.networkName} (${record.chainId})`],
          ["Transaction", record.txHash]
        ]
          .map(
            ([label, value]) =>
              `<div class="card"><dt>${label}</dt><dd>${value}</dd></div>`
          )
          .join("")}
      </dl>
      ${supersededBlock}
      <p class="footer">Suggested export name: ${buildCertificateExportName(record)}</p>
    </body>
  </html>`;
}

export function CertificateActions({
  record,
  variant
}: CertificateActionsProps) {
  const [error, setError] = useState<string | null>(null);

  function handlePrint() {
    try {
      setError(null);
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
      if (!printWindow) {
        throw new Error("The browser blocked the print window.");
      }

      printWindow.document.open();
      printWindow.document.write(buildPrintDocument(record, variant));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 150);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not open the print dialog.");
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Save or print PDF
        </button>
        <span className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
          {buildCertificateExportName(record)}
        </span>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
