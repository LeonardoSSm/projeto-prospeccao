import type { Prisma } from "@prisma/client";
import { DedupeService } from "./dedupe.service";

type MockTx = {
  leadSource: { findUnique: jest.Mock };
  lead: { findFirst: jest.Mock };
  leadContact: { findFirst: jest.Mock };
};

function createMockTx(): MockTx {
  return {
    leadSource: { findUnique: jest.fn().mockResolvedValue(null) },
    lead: { findFirst: jest.fn().mockResolvedValue(null) },
    leadContact: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

const baseInput = {
  organizationId: "org-1",
  provider: "MOCK",
  externalId: "ext-1",
  cnpj: null as string | null,
  normalizedDomain: null as string | null,
  normalizedPhone: null as string | null,
};

describe("DedupeService", () => {
  const dedupe = new DedupeService();

  it("returns MATCH when the exact provider/externalId source already exists", async () => {
    const tx = createMockTx();
    tx.leadSource.findUnique.mockResolvedValue({ leadId: "lead-1" });

    const result = await dedupe.findMatch(tx as unknown as Prisma.TransactionClient, baseInput);

    expect(result).toEqual({ kind: "MATCH", leadId: "lead-1" });
    expect(tx.lead.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to a CNPJ match when there is no source match", async () => {
    const tx = createMockTx();
    tx.lead.findFirst.mockResolvedValue({ id: "lead-cnpj" });

    const result = await dedupe.findMatch(tx as unknown as Prisma.TransactionClient, {
      ...baseInput,
      cnpj: "00000000000100",
    });

    expect(result).toEqual({ kind: "MATCH", leadId: "lead-cnpj" });
    expect(tx.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cnpj: "00000000000100", mergedIntoId: null }),
      }),
    );
  });

  it("falls back to a domain match when there is no source or CNPJ match", async () => {
    const tx = createMockTx();
    tx.lead.findFirst.mockResolvedValue({ id: "lead-2" });

    const result = await dedupe.findMatch(tx as unknown as Prisma.TransactionClient, {
      ...baseInput,
      normalizedDomain: "exemplo.com.br",
    });

    expect(result).toEqual({ kind: "MATCH", leadId: "lead-2" });
    expect(tx.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ normalizedDomain: "exemplo.com.br", mergedIntoId: null }),
      }),
    );
  });

  it("falls back to a phone match when there is no source or domain match", async () => {
    const tx = createMockTx();
    tx.leadContact.findFirst.mockResolvedValue({ leadId: "lead-3" });

    const result = await dedupe.findMatch(tx as unknown as Prisma.TransactionClient, {
      ...baseInput,
      normalizedPhone: "+558533334444",
    });

    expect(result).toEqual({ kind: "MATCH", leadId: "lead-3" });
  });

  it("returns NEW when no signal matches", async () => {
    const tx = createMockTx();

    const result = await dedupe.findMatch(tx as unknown as Prisma.TransactionClient, {
      ...baseInput,
      normalizedDomain: "outro.com.br",
      normalizedPhone: "+558511112222",
    });

    expect(result).toEqual({ kind: "NEW" });
  });
});
