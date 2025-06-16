import { Effect } from "effect"
import init_base from "./plugin_instances/base"
import { EnvironmentT } from "./plugins/environment";
import localPluginEnvironment from "./kernel/local_plugin_env";

Effect.gen(function* (_) {
    return yield* init_base.pipe(
        Effect.provideService(
            EnvironmentT,
            localPluginEnvironment
        )
    );
}).pipe(Effect.runPromise);