import { Context, Effect } from "effect";
import type { FAssetsError } from "../errors";
import type { Signer } from "ethers";

export interface AgentInfo {
  agentVault: string;
  freeCollateralLots: bigint;
  mintFeeMillionths: bigint;
  vaultAddress: string;
}

export interface AssetManagerSettings {
  fAsset: string;
  lotSizeAMG: bigint;
  mintingCapAMG: bigint;
  assetMintingGranularityUBA: bigint;
}

export interface FXRPTokenInfo {
  balance: string;
  rawBalance: bigint;
  decimals: number;
  symbol: string;
}

export class FAssetsService extends Context.Tag("FAssetsService")<
  FAssetsService,
  {
    readonly getSettings: () => Effect.Effect<AssetManagerSettings, FAssetsError>;
    readonly getManagerAddress: () => Effect.Effect<string, FAssetsError>;
    readonly fetchAgents: () => Effect.Effect<AgentInfo[], FAssetsError>;
    readonly getTokenInfo: (
      walletAddress: string
    ) => Effect.Effect<FXRPTokenInfo, FAssetsError>;
    readonly getTotalSupply: () => Effect.Effect<string, FAssetsError>;
    readonly reserveCollateral: (
      signer: Signer,
      agentVault: string,
      lots: number,
      maxFeeBIPS: number
    ) => Effect.Effect<{ txHash: string; reservationId: bigint }, FAssetsError>;
    readonly executeMinting: (
      signer: Signer,
      paymentProof: string,
      reservationId: bigint
    ) => Effect.Effect<{ txHash: string }, FAssetsError>;
    readonly requestRedemption: (
      signer: Signer,
      lots: number,
      xrplAddress: string
    ) => Effect.Effect<{ txHash: string }, FAssetsError>;
  }
>() {}
