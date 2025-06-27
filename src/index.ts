import { EnvironmentT } from "../messaging/src/base/environment";
import { PluginEffect } from "./plugin_lib/plugin_effect";
import { Effect, Either } from "effect";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner/message_partner";
import { InternalCommunication } from "./plugin_lib/message_partners/internal_communication/internal_messages/protocol";

const mp1 = new MessagePartner(new LocalAddress("plugin2"), "test");
const mp2 = new MessagePartner(new LocalAddress("plugin1"), "test"); //, mp1.uuid);

const plugin1: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* InternalCommunication.middleware(env));

    // ===============================================================

    mp1.on_bridge((bridge) => {
        console.log("Logging from Plugin 1", bridge);
        bridge.on((data) => {
            console.log("Logging from Plugin 1", data);
        });
    })
});

const plugin2: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* InternalCommunication.middleware(env));

    // ===============================================================
    const a = yield* mp2.bridge();
    a.send("Hello");
});

const programm1 = plugin1.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress("plugin1")
)));

const programm2 = plugin2.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress("plugin2")
)));

Effect.all([
    programm1,
    programm2
]).pipe(Effect.runPromise);