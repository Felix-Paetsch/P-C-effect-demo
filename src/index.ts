import { EnvironmentT } from "../messaging/src/base/environment";
import { PluginEffect } from "./plugin_lib/plugin_effect";
import { Effect } from "effect";
import { createLocalEnvironment } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { asUUID } from "../messaging/src/base/uuid";
import { Ping } from "../messaging/src/protocols/ping";

const plugin1: PluginEffect = Effect.gen(function* (_) {
    const a = yield* Effect.succeed(1);
    return a;
});

const plugin2: PluginEffect = Effect.gen(function* (_) {
    const plugin1_address = new LocalAddress(asUUID("plugin1"));
    const a = yield* Ping.run(plugin1_address);
    console.log(a);
    return a;
});

const programm1 = plugin1.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress(asUUID("plugin1"))
)));

const programm2 = plugin2.pipe(Effect.provideServiceEffect(EnvironmentT, createLocalEnvironment(
    new LocalAddress(asUUID("plugin2"))
)));

Effect.all([
    programm1,
    programm2
]).pipe(Effect.runPromise);

/*

Initiate first
Initiate second, second pings first

*/