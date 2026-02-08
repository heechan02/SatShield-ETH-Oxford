import { Layer, Effect } from "effect";
import { TimeService } from "../services/TimeService";

export const TimeServiceLive = Layer.succeed(TimeService, {
  now: () => Effect.sync(() => new Date()),
});
