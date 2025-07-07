import { Effect } from "effect";
import { createLocalEnvironment, EnvironmentT } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { InternalCommunication } from "./plugin_lib/message_partners/internal_communication/protocol";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner/message_partner";
import { PluginEffect } from "./plugin_lib/plugin_effect";

const env1 = createLocalEnvironment(new LocalAddress("plugin1")).pipe(Effect.runSync);
const env2 = createLocalEnvironment(new LocalAddress("plugin2")).pipe(Effect.runSync);

const [mp1, mp2] = MessagePartner.makeLocalPair(env1, env2).pipe(Effect.runSync);
(mp1 as any).customProp = "I AM MP1";
(mp2 as any).customProp = "MP2 AM I";

const plugin1: PluginEffect = Effect.gen(function* () {
    const env = yield* EnvironmentT;
    yield* env.useMiddleware(yield* InternalCommunication.middleware(env));

    // ===============================================================

    mp1.on_bridge((bridge) => {
        console.log("HERE IS MY BRIDGE");
        bridge.on((data) => {
            console.log(data + ", and I must scream");
        });
    })
}).pipe(Effect.tapError(e => Effect.logError(e)));

const plugin2: PluginEffect = Effect.gen(function* () {
    const env = yield* EnvironmentT;
    yield* env.useMiddleware(yield* InternalCommunication.middleware(env));

    // ===============================================================
    const bridge = yield* mp2.bridge();
    yield* bridge.send("I have no mouth");
}).pipe(Effect.tapError(e => Effect.logError(e)));















const programm1 = plugin1.pipe(Effect.provideService(EnvironmentT, env1));

const programm2 = plugin2.pipe(Effect.provideService(EnvironmentT, env2));

Effect.all(
    [
        programm1,
        programm2
    ], {
    concurrency: "unbounded"
}
).pipe(
    // Effect.runSync
    Effect.runPromise
);
