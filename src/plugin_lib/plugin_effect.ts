import { Effect } from "effect";
import { EnvironmentT } from "../../messaging/src/base/environment";
export type PluginEffect = Effect.Effect<void, Error, EnvironmentT>;