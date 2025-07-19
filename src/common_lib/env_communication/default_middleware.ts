import { Effect } from "effect";
import { Environment } from "../../../messaging/src/base/environment";
import { partition_middleware } from "../../../messaging/src/middleware/partition";

export const registerDefaultEnvironmentMiddleware = function (env: Environment) {
    return Effect.gen(function* () {
        const pm = partition_middleware([
            "preprocessing",
            "monitoring",
            "listeners",
        ] as const);

        yield* env.useMiddleware(pm())
        return pm;
    })
};