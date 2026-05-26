import type { PublicAttestationRecord } from "./domain.ts";

function sanitizeReference(reference: string): string {
  return reference.replace(/[:]/g, "_");
}

export function buildCertificatePrintTitle(record: PublicAttestationRecord): string {
  return `zkNotary Certificate - ${sanitizeReference(record.attestationRef)}`;
}

export function buildCertificateExportName(record: PublicAttestationRecord): string {
  return `zknotary-certificate-${sanitizeReference(record.attestationRef)}.pdf`;
}
