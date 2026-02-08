import { Layer, Effect } from "effect";
import { FAssetsService } from "../services/FAssetsService";
import { FAssetsError } from "../errors";
import {
  getAssetManagerReadContract,
  getAssetManagerWriteContract,
  getAssetManagerAddress,
  getFXRPReadContract,
  getFXRPWriteContract,
} from "@/lib/flareContracts";
import { formatUnits, parseUnits, type Signer } from "ethers";
import { withRetry, isTransientRpcError } from "@/lib/rpcRetry";

const READ_RETRY = { maxAttempts: 3, baseDelayMs: 600, isRetryable: isTransientRpcError };

export const FAssetsServiceLive = Layer.succeed(FAssetsService, {
  getSettings: () =>
    Effect.tryPromise({
      try: () =>
        withRetry(async () => {
          const contract = await getAssetManagerReadContract();
          const s = await contract.getSettings();
          return {
            fAsset: s.fAsset,
            lotSizeAMG: s.lotSizeAMG,
            mintingCapAMG: s.mintingCapAMG,
            assetMintingGranularityUBA: s.assetMintingGranularityUBA,
          };
        }, READ_RETRY),
      catch: (e: any) => new FAssetsError({ message: e.message || "Failed to fetch settings" }),
    }),

  getManagerAddress: () =>
    Effect.tryPromise({
      try: () => getAssetManagerAddress(), // already retried internally
      catch: (e: any) => new FAssetsError({ message: e.message || "Failed to resolve AssetManager" }),
    }),

  fetchAgents: () =>
    Effect.tryPromise({
      try: () =>
        withRetry(async () => {
          const contract = await getAssetManagerReadContract();
          const agentList = await contract.getAvailableAgentsDetailedList(0, 20);
          return agentList.map((a: any) => ({
            agentVault: a.agentVault,
            freeCollateralLots: a.freeCollateralLots,
            mintFeeMillionths: a.mintFeeMillionths,
            vaultAddress: a.vaultAddress || "",
          }));
        }, READ_RETRY),
      catch: (e: any) => new FAssetsError({ message: e.reason || e.message || "Failed to fetch agents" }),
    }),

  getTokenInfo: (walletAddress: string) =>
    Effect.tryPromise({
      try: () =>
        withRetry(async () => {
          const contract = getFXRPReadContract();
          const [bal, dec, sym] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
            contract.symbol(),
          ]);
          return { balance: formatUnits(bal, Number(dec)), rawBalance: bal, decimals: Number(dec), symbol: sym };
        }, READ_RETRY),
      catch: (e: any) => new FAssetsError({ message: e.message || "Failed to fetch FXRP balance" }),
    }),

  getTotalSupply: () =>
    Effect.tryPromise({
      try: () =>
        withRetry(async () => {
          const contract = getFXRPReadContract();
          const [supply, dec] = await Promise.all([contract.totalSupply(), contract.decimals()]);
          return formatUnits(supply, Number(dec));
        }, READ_RETRY),
      catch: (e: any) => new FAssetsError({ message: e.message || "Failed to fetch total supply" }),
    }),

  reserveCollateral: (signer: Signer, agentVault: string, lots: number, maxFeeBIPS: number) =>
    Effect.tryPromise({
      try: async () => {
        const contract = await getAssetManagerWriteContract(signer);
        const tx = await contract.reserveCollateral(agentVault, lots, maxFeeBIPS, {
          value: parseUnits("1", "ether"),
        });
        const receipt = await tx.wait();
        const reservationId = receipt?.logs?.[0]?.topics?.[1]
          ? BigInt(receipt.logs[0].topics[1])
          : 0n;
        return { txHash: tx.hash, reservationId };
      },
      catch: (e: any) => new FAssetsError({ message: e.reason || e.message || "Reservation failed", step: "reserve" }),
    }),

  executeMinting: (signer: Signer, paymentProof: string, reservationId: bigint) =>
    Effect.tryPromise({
      try: async () => {
        const contract = await getAssetManagerWriteContract(signer);
        const tx = await contract.executeMinting(paymentProof, reservationId);
        await tx.wait();
        return { txHash: tx.hash };
      },
      catch: (e: any) => new FAssetsError({ message: e.reason || e.message || "Minting failed", step: "execute" }),
    }),

  requestRedemption: (signer: Signer, lots: number, xrplAddress: string) =>
    Effect.tryPromise({
      try: async () => {
        const fxrpContract = getFXRPWriteContract(signer);
        const managerAddr = await getAssetManagerAddress();
        const approveTx = await fxrpContract.approve(managerAddr, parseUnits("1000000", 18));
        await approveTx.wait();
        const contract = await getAssetManagerWriteContract(signer);
        const tx = await contract.requestRedemption(lots, xrplAddress);
        await tx.wait();
        return { txHash: tx.hash };
      },
      catch: (e: any) => new FAssetsError({ message: e.reason || e.message || "Redemption failed", step: "redeem" }),
    }),
});
