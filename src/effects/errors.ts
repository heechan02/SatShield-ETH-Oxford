/**
 * Typed error hierarchy for SatShield's effect system.
 * Each error carries structured metadata for debugging and recovery.
 */
import { Data } from "effect";

export class FTSOError extends Data.TaggedError("FTSOError")<{
  readonly message: string;
  readonly feedName?: string;
}> {}

export class FDCError extends Data.TaggedError("FDCError")<{
  readonly message: string;
  readonly sourceName?: string;
}> {}

export class BlockchainError extends Data.TaggedError("BlockchainError")<{
  readonly message: string;
  readonly txHash?: string;
}> {}

export class OracleError extends Data.TaggedError("OracleError")<{
  readonly message: string;
  readonly poolType?: string;
  readonly source?: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly table?: string;
  readonly operation?: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly field?: string;
}> {}

export class FAssetsError extends Data.TaggedError("FAssetsError")<{
  readonly message: string;
  readonly step?: string;
}> {}

export type AppError =
  | FTSOError
  | FDCError
  | BlockchainError
  | OracleError
  | DatabaseError
  | ValidationError
  | FAssetsError;
