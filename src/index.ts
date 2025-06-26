import { EnvironmentT } from "../messaging/src/base/environment";
import { PluginEffect } from "./plugin_lib/plugin_effect";
import { Effect, Either } from "effect";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { MessagePartner } from "./plugin_lib/message_partners/message_partner";
import { MessagePartnerObjectCommunication } from "./plugin_lib/message_partners/mpo_internal_communication/messaging_protocol/message_partner_object_communication";
import { Ping } from "./plugin_lib/message_partners/mpo_internal_communication/mpo_protocols/ping";

// const mp1 = new MessagePartner(new LocalAddress("plugin2"), "test_1");
const mp2 = new MessagePartner(new LocalAddress("plugin1"), "test_2"); //, mp1.uuid);

const plugin1: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* MessagePartnerObjectCommunication.middleware(env));

    // ===============================================================
});

const plugin2: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* MessagePartnerObjectCommunication.middleware(env));

    // ===============================================================
    const a = yield* Ping.run(mp2);
    if (Either.isLeft(a)) {
        console.log("LEFT", a.left);
    } else {
        console.log(a.right);
    }
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