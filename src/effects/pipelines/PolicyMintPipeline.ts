import { Effect } from "effect";
import { BlockchainService, type MintResult } from "../services/BlockchainService";
import { DatabaseService, type PolicyRecord, type CreatePolicyInput } from "../services/DatabaseService";
import { ValidationError, type BlockchainError, type DatabaseError } from "../errors";
import type { Signer } from "ethers";

export interface PolicyMintInput extends CreatePolicyInput {
  premiumInFLR: string;
}

export interface PolicyMintResult {
  policy: PolicyRecord;
  onChain: MintResult | null;
}

function validateCoverage(
  input: PolicyMintInput
): Effect.Effect<PolicyMintInput, ValidationError> {
  if (input.coverage_amount <= 0) {
    return Effect.fail(
      new ValidationError({ message: "Coverage amount must be positive", field: "coverage_amount" })
    );
  }
  if (input.premium_amount <= 0) {
    return Effect.fail(
      new ValidationError({ message: "Premium must be positive", field: "premium_amount" })
    );
  }
  return Effect.succeed(input);
}

export const execute = (
  userId: string,
  input: PolicyMintInput,
  signer?: Signer
): Effect.Effect<
  PolicyMintResult,
  ValidationError | BlockchainError | DatabaseError,
  BlockchainService | DatabaseService
> =>
  Effect.gen(function* () {
    const validated = yield* validateCoverage(input);
    const db = yield* DatabaseService;
    const blockchain = yield* BlockchainService;

    let onChain: MintResult | null = null;
    if (signer) {
      onChain = yield* blockchain.mintPolicy(signer, {
        poolType: validated.pool_type,
        location: validated.location_address,
        coverageAmount: validated.coverage_amount,
        triggerValue: validated.trigger_value,
        premiumInFLR: validated.premiumInFLR,
      });
    }

    const policyInput: CreatePolicyInput = {
      ...validated,
      tx_hash: onChain?.txHash,
      on_chain_policy_id: onChain?.policyId ? Number(onChain.policyId) : undefined,
    };
    const policy = yield* db.createPolicy(userId, policyInput);

    yield* db.createTimelineEvent({
      policy_id: policy.id,
      user_id: userId,
      event_type: "created",
      description: `Policy minted — ${validated.pool_type} shield for ${validated.location_address}`,
    });

    return { policy, onChain };
  });

export const PolicyMintPipeline = { execute };
