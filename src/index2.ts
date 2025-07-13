import { Effect } from "effect";
import { createLocalEnvironment, EnvironmentT } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { Message, MessageT } from "../messaging/src/base/message";
import { chain_middleware, ChainMessageResultT, make_message_chain } from "../messaging/src/middleware/message_chains";
import { PluginEffect } from "./plugin_lib/plugin_effect";

const env1 = createLocalEnvironment(new LocalAddress("plugin1")).pipe(Effect.runSync);
const env2 = createLocalEnvironment(new LocalAddress("plugin2")).pipe(Effect.runSync);

const plugin1: PluginEffect = Effect.gen(function* () {
    const env = yield* EnvironmentT;
    yield* env.useMiddleware(chain_middleware(
        Effect.gen(function* () {
            console.log("1");
            const res = yield* ChainMessageResultT;
            yield* res.requestRespond({ response: "Hello from plugin1!" }, {}, 100000000);
            console.log("2");
        }).pipe(Effect.provideService(EnvironmentT, env), Effect.orDie),
        Effect.void
    ));
    console.log("PLUGIN1: Listening");
    yield* Effect.void;
}).pipe(Effect.tapError(e => Effect.logError(e)));

const plugin2: PluginEffect = Effect.gen(function* () {
    const env = yield* EnvironmentT;
    yield* env.useMiddleware(chain_middleware());

    const initialMessage = new Message(
        env1.ownAddress,
        { greeting: "Hello from plugin2!" }
    );

    const send = env.send.pipe(Effect.provideService(MessageT, initialMessage));
    const MMC = yield* make_message_chain(initialMessage, 100000000);
    console.log("A");

    const sendFiber = yield* Effect.fork(send);
    const mmc_res = yield* MMC;
    console.log("B");

    yield* mmc_res.respond({ response: "Hello from plugin2!" });
}).pipe(Effect.tapError(e => Effect.logError(e)));

const program1 = plugin1.pipe(Effect.provideService(EnvironmentT, env1));
const program2 = plugin2.pipe(Effect.provideService(EnvironmentT, env2));

Effect.all([program1, program2], {
    concurrency: "unbounded"
}).pipe(
    Effect.runPromise
);
