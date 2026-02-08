import { Context, Effect } from "effect";
import type { FTSOError } from "../errors";
import type { FeedName } from "@/lib/flareContracts";

export interface FTSOFeedData {
  name: FeedName;
  value: number;
  decimals: number;
  timestamp: number;
}

export class FTSOService extends Context.Tag("FTSOService")<
  FTSOService,
  {
    readonly readFeeds: (
      feedNames: FeedName[]
    ) => Effect.Effect<FTSOFeedData[], FTSOError>;
  }
>() {}
