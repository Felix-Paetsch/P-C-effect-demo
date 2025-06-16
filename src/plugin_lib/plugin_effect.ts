import { Effect } from "effect";
import { EnvironmentT } from "./environment";
export type PluginEffect = Effect.Effect<void, Error, EnvironmentT>;