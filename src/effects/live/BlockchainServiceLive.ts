import { Layer, Effect } from "effect";
import {
  BlockchainService,
  type OnChainPolicy,
  type MintResult,
  type MintParams,
  type PayoutResult,
} from "../services/BlockchainService";
import { BlockchainError } from "../errors";
import {
  getShieldPolicyReadContract,
  getShieldPolicyWriteContract,
  getReadProvider,
  FLARE_SHIELD_POLICY_ADDRESS,
} from "@/lib/flareContracts";
import { parseEther, formatEther, type Signer } from "ethers";

export const BlockchainServiceLive = Layer.succeed(BlockchainService, {
  readPolicyCount: () =>
    Effect.tryPromise({
      try: async () => {
        const contract = getShieldPolicyReadContract();
        const count = await contract.getPolicyCount();
        return Number(count);
      },
      catch: (e) =>
        new BlockchainError({
          message:
            e instanceof Error ? e.message : "Failed to read policy count",
        }),
    }),

  readContractBalance: () =>
    Effect.tryPromise({
      try: async () => {
        const provider = getReadProvider();
        const balance = await provider.getBalance(FLARE_SHIELD_POLICY_ADDRESS);
        return formatEther(balance);
      },
      catch: (e) =>
        new BlockchainError({
          message:
            e instanceof Error
              ? e.message
              : "Failed to read contract balance",
        }),
    }),

  readPolicy: (policyId: number) =>
    Effect.tryPromise({
      try: async () => {
        const contract = getShieldPolicyReadContract();
        const result = await contract.getPolicy(policyId);
        return {
          owner: result[0],
          poolType: result[1],
          location: result[2],
          coverageAmount: result[3],
          triggerValue: result[4],
          premium: result[5],
          active: result[6],
          createdAt: result[7],
        } as OnChainPolicy;
      },
      catch: (e) =>
        new BlockchainError({
          message: e instanceof Error ? e.message : "Failed to read policy",
        }),
    }),

  mintPolicy: (signer: Signer, params: MintParams) =>
    Effect.tryPromise({
      try: async () => {
        const contract = getShieldPolicyWriteContract(signer);
        const coverageWei = parseEther(String(params.coverageAmount));
        const triggerWei = parseEther(String(params.triggerValue));
        const premiumWei = parseEther(params.premiumInFLR);

        const tx = await contract.createPolicy(
          params.poolType,
          params.location,
          coverageWei,
          triggerWei,
          { value: premiumWei }
        );

        const receipt = await tx.wait();

        let policyId: string | null = null;
        try {
          for (const log of receipt?.logs || []) {
            try {
              const parsed = contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
              if (parsed?.name === "PolicyCreated") {
                policyId = parsed.args.policyId.toString();
                break;
              }
            } catch {
              // Not a matching event
            }
          }
        } catch {
          // Couldn't parse events
        }

        return { txHash: tx.hash, policyId } as MintResult;
      },
      catch: (e: unknown) =>
        new BlockchainError({
          message:
            (e as any)?.reason ||
            (e instanceof Error ? e.message : "Minting failed"),
        }),
    }),

  triggerPayout: (signer: Signer, policyId: number, proof: string) =>
    Effect.tryPromise({
      try: async () => {
        const contract = getShieldPolicyWriteContract(signer);
        const tx = await contract.triggerPayout(policyId, proof);
        await tx.wait();
        return { txHash: tx.hash } as PayoutResult;
      },
      catch: (e: unknown) =>
        new BlockchainError({
          message:
            (e as any)?.reason ||
            (e instanceof Error ? e.message : "Payout trigger failed"),
        }),
    }),
});
