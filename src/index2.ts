import { Effect } from "effect";
import { createLocalEnvironment, EnvironmentT } from "../messaging/src/base/environment";
import { LocalAddress } from "../messaging/src/base/address";
import { chain_middleware, make_message_chain, ResponseFunctionT } from "../messaging/src/middleware/message_chains";
import { MessageT, Message } from "../messaging/src/base/message";


Effect.gen(function* (_) {
    const env1 = yield* createLocalEnvironment(
        new LocalAddress("plugin2")
    );
    const env2 = yield* createLocalEnvironment(
        new LocalAddress("plugin1")
    );

    yield* env1.useMiddleware(chain_middleware(
        // On first message just respond
        Effect.gen(function* (_) {
            const res = yield* _(ResponseFunctionT);
            console.log("ON FIRST MESSAGE");
            const resE = yield* res({
                "test": "Respond!"
            }, {});
        }).pipe(
            Effect.ignore,
            Effect.provideService(EnvironmentT, env1)
        ),
        Effect.void
    ));

    yield* env2.useMiddleware(chain_middleware(
        Effect.void,
        Effect.gen(function* (_) {
            const message = yield* _(MessageT);
            console.log("MESSAGE REACHED ITS TARGET!", message);
        })
    ));

    {
        const msg = new Message(new LocalAddress("plugin2"), "test", {
            "test": "Hello"
        });

        const resE = yield* make_message_chain(
            msg
        ).pipe(
            Effect.provideService(EnvironmentT, env2)
        );

        yield* env2.send.pipe(
            Effect.provideService(MessageT, msg)
        );

        // This should give us the response
        yield* resE;
    }
}).pipe(
    Effect.tapError(e => Effect.logError(e)),
    Effect.ignore,
    Effect.runSync
);
