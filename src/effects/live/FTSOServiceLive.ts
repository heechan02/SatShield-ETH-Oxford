import { Layer, Effect } from "effect";
import { FTSOService, type FTSOFeedData } from "../services/FTSOService";
import { FTSOError } from "../errors";
import {
  getFtsoV2ReadContract,
  FEED_IDS,
  formatFeedValue,
  type FeedName,
} from "@/lib/flareContracts";
import { withRetry, isTransientRpcError } from "@/lib/rpcRetry";

export const FTSOServiceLive = Layer.succeed(FTSOService, {
  readFeeds: (feedNames: FeedName[]) =>
    Effect.tryPromise({
      try: () =>
        withRetry(async () => {
          const ftsoV2 = getFtsoV2ReadContract();
          const feedIds = feedNames.map((name) => FEED_IDS[name]);
          const result = await ftsoV2.getFeedsById.staticCall(feedIds);
          const [values, decimals, timestamp] = result;
          return feedNames.map(
            (name, i): FTSOFeedData => ({
              name,
              value: formatFeedValue(values[i], decimals[i]),
              decimals: Number(decimals[i]),
              timestamp: Number(timestamp),
            })
          );
        }, { maxAttempts: 3, baseDelayMs: 600, isRetryable: isTransientRpcError }),
      catch: (e) =>
        new FTSOError({
          message: e instanceof Error ? e.message : "Failed to fetch FTSO feeds",
        }),
    }),
});
