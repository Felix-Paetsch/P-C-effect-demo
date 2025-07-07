import { Effect } from "effect";
import { createLocalEnvironment, EnvironmentT } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { InternalCommunication } from "./plugin_lib/message_partners/internal_communication/protocol";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner/message_partner";
import { PluginEffect } from "./plugin_lib/plugin_effect";

const [mp2, mp1] = MessagePartner.makeLocalPair(new LocalAddress("plugin1"), new LocalAddress("plugin2")).pipe(Effect.runSync);

const plugin1: PluginEffect = Effect.gen(function* () {
    const env = yield* EnvironmentT;
    yield* env.useMiddleware(yield* InternalCommunication.middleware(env));

    // ===============================================================

    mp1.on_bridge((bridge) => {
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















const programm1 = plugin1.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress("plugin1")
)));

const programm2 = plugin2.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress("plugin2")
)));

Effect.all(
    [
        programm1,
        programm2
    ], {
    concurrency: "unbounded"
}
).pipe(
    Effect.runSync
);
