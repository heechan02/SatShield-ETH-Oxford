/**
 * AppLayer — Production layer composition.
 * Merges all live service implementations into a single layer
 * that can be provided to Effect.runPromise at the edge (hooks / edge functions).
 */
import { Layer } from "effect";
import { FTSOServiceLive } from "./live/FTSOServiceLive";
import { BlockchainServiceLive } from "./live/BlockchainServiceLive";
import { FDCServiceLive } from "./live/FDCServiceLive";
import { OracleServiceLive } from "./live/OracleServiceLive";
import { DatabaseServiceLive } from "./live/DatabaseServiceLive";
import { TimeServiceLive } from "./live/TimeServiceLive";
import { FAssetsServiceLive } from "./live/FAssetsServiceLive";

export const AppLayer = Layer.mergeAll(
  FTSOServiceLive,
  BlockchainServiceLive,
  FDCServiceLive,
  OracleServiceLive,
  DatabaseServiceLive,
  TimeServiceLive,
  FAssetsServiceLive
);
