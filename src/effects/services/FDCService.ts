import { Context, Effect } from "effect";
import type { FDCError } from "../errors";
import type { Signer } from "ethers";

export interface FDCRequestParams {
  attestationType: string;
  sourceId: string;
  url: string;
  httpMethod: string;
  postprocessJq: string;
  abiSignature: string;
  sourceName: string;
}

export interface FDCAttestationResult {
  status: "confirmed" | "error";
  txHash: string | null;
  sourceName: string;
}

export class FDCService extends Context.Tag("FDCService")<
  FDCService,
  {
    readonly submitAttestation: (
      signer: Signer,
      params: FDCRequestParams
    ) => Effect.Effect<string, FDCError>;
    readonly submitMultiSource: (
      signer: Signer,
      params: FDCRequestParams[]
    ) => Effect.Effect<FDCAttestationResult[], FDCError>;
  }
>() {}
