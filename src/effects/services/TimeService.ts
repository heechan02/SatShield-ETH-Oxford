import { Context, Effect } from "effect";

export class TimeService extends Context.Tag("TimeService")<
  TimeService,
  {
    readonly now: () => Effect.Effect<Date>;
  }
>() {}
