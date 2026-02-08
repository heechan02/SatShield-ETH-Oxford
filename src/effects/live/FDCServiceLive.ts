import { Layer, Effect } from "effect";
import { FDCService, type FDCRequestParams, type FDCAttestationResult } from "../services/FDCService";
import { FDCError } from "../errors";
import { getFdcHubWriteContract } from "@/lib/flareContracts";
import { AbiCoder, toUtf8Bytes, keccak256, type Signer } from "ethers";

async function encodeAndSubmit(signer: Signer, params: FDCRequestParams): Promise<string> {
  const attestationType = params.attestationType || keccak256(toUtf8Bytes("Web2Json"));
  const sourceId = params.sourceId || keccak256(toUtf8Bytes("WEB2"));
  const abiCoder = AbiCoder.defaultAbiCoder();
  const requestBody = abiCoder.encode(
    ["string", "string", "string", "string", "string", "string"],
    [params.url, params.httpMethod || "GET", "{}", "{}", "{}", params.postprocessJq]
  );
  const abiEncodedRequest = abiCoder.encode(
    ["bytes32", "bytes32", "bytes"],
    [attestationType, sourceId, requestBody]
  );
  const fdcHub = getFdcHubWriteContract(signer);
  const tx = await fdcHub.requestAttestation(abiEncodedRequest, { value: 0n });
  await tx.wait();
  return tx.hash as string;
}

export const FDCServiceLive = Layer.succeed(FDCService, {
  submitAttestation: (signer: Signer, params: FDCRequestParams) =>
    Effect.tryPromise({
      try: () => encodeAndSubmit(signer, params),
      catch: (e: unknown) =>
        new FDCError({
          message: (e as any)?.reason || (e instanceof Error ? e.message : "Attestation failed"),
          sourceName: params.sourceName,
        }),
    }),

  submitMultiSource: (signer: Signer, params: FDCRequestParams[]) =>
    Effect.tryPromise({
      try: async () => {
        const results: FDCAttestationResult[] = [];
        for (const p of params) {
          try {
            const hash = await encodeAndSubmit(signer, p);
            results.push({ status: "confirmed", txHash: hash, sourceName: p.sourceName });
          } catch {
            results.push({ status: "error", txHash: null, sourceName: p.sourceName });
          }
        }
        return results;
      },
      catch: (e: unknown) =>
        new FDCError({
          message: e instanceof Error ? e.message : "Multi-source attestation failed",
        }),
    }),
});
