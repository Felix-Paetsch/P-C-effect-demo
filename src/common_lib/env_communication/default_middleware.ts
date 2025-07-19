import { Effect } from "effect";
import { Environment } from "../../../messaging/src/base/environment";
import { MessageT } from "../../../messaging/src/base/message";
import { partition_middleware } from "../../../messaging/src/middleware/partition";

export const registerDefaultEnvironmentMiddleware = function (env: Environment) {
    return Effect.gen(function* () {
        const pm = partition_middleware([
            "preprocessing",
            "monitoring",
            "listeners",
        ] as const);

        pm.preprocessing.push(Effect.gen(function* () {
            const message = yield* MessageT;
            console.log("MESSAGE", message);
        }));

        const hm = partition_middleware(["test"]);
        const hm2 = partition_middleware([["test2", log_message("MESSAGE_TESTB")]]);
        hm.test.push(log_message("MESSAGE_TESTA"));

        yield* env.useMiddleware(hm());
        yield* env.useMiddleware(pm())
        return pm;
    })
};

function log_message(s: string) {
    return Effect.gen(function* () {
        const message = yield* MessageT;
        console.log(s);
    })
}