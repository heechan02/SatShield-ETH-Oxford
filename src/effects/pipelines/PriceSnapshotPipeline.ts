import { Effect } from "effect";
import { FTSOService } from "../services/FTSOService";
import { DatabaseService, type PriceSnapshotRecord } from "../services/DatabaseService";
import type { FTSOError, DatabaseError } from "../errors";

export const snapshot = (): Effect.Effect<
  void,
  FTSOError | DatabaseError,
  FTSOService | DatabaseService
> =>
  Effect.gen(function* () {
    const ftso = yield* FTSOService;
    const db = yield* DatabaseService;
    const feeds = yield* ftso.readFeeds(["FLR/USD", "XRP/USD"]);
    const flr = feeds.find((f) => f.name === "FLR/USD")?.value || 0;
    const xrp = feeds.find((f) => f.name === "XRP/USD")?.value || 0;
    yield* db.savePriceSnapshot({ flr_usd: flr, xrp_usd: xrp });
  });

export const readHistory = (
  limit: number
): Effect.Effect<PriceSnapshotRecord[], DatabaseError, DatabaseService> =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.getPriceHistory(limit);
  });

export const PriceSnapshotPipeline = { snapshot, readHistory };
