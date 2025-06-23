import { EnvironmentT } from "../messaging/src/base/environment";
import { PluginEffect } from "./plugin_lib/plugin_effect";
import { Effect, Either } from "effect";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { Ping } from "../messaging/src/protocols/ping";

const plugin1: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* Ping.middleware(env));
});

const plugin2: PluginEffect = Effect.gen(function* (_) {
    const env = yield* _(EnvironmentT);
    yield* env.useMiddleware(yield* Ping.middleware(env));

    const plugin1_address = new LocalAddress("plugin1");
    const a = yield* Ping.run(plugin1_address);

    if (Either.isLeft(a)) {
        console.log("PING FAILED", a.left);
    } else {
        console.log("PING SUCCESSFUL", a.right);
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