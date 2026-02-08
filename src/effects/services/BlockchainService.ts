import { Context, Effect } from "effect";
import type { BlockchainError } from "../errors";
import type { Signer } from "ethers";

export interface MintParams {
  poolType: string;
  location: string;
  coverageAmount: number;
  triggerValue: number;
  premiumInFLR: string;
}

export interface MintResult {
  txHash: string;
  policyId: string | null;
}

export interface PayoutResult {
  txHash: string;
}

export interface OnChainPolicy {
  owner: string;
  poolType: string;
  location: string;
  coverageAmount: bigint;
  triggerValue: bigint;
  premium: bigint;
  active: boolean;
  createdAt: bigint;
}

export class BlockchainService extends Context.Tag("BlockchainService")<
  BlockchainService,
  {
    readonly readPolicyCount: () => Effect.Effect<number, BlockchainError>;
    readonly readContractBalance: () => Effect.Effect<string, BlockchainError>;
    readonly readPolicy: (
      policyId: number
    ) => Effect.Effect<OnChainPolicy, BlockchainError>;
    readonly mintPolicy: (
      signer: Signer,
      params: MintParams
    ) => Effect.Effect<MintResult, BlockchainError>;
    readonly triggerPayout: (
      signer: Signer,
      policyId: number,
      proof: string
    ) => Effect.Effect<PayoutResult, BlockchainError>;
  }
>() {}
