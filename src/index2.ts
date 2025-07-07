import { Console, Deferred, Duration, Effect, pipe } from "effect";

Effect.gen(function* () {
    const deferred_array: Deferred.Deferred<number, never>[] = [];

    const p1 = Effect.gen(function* () {
        deferred_array.push(yield* Deferred.make<number, never>());
        yield* pipe(
            deferred_array[0],
            Effect.tap(() => Console.log("P1 AWAITED")),
            Effect.timeout(Duration.millis(10000))
        );

        const d2 = deferred_array.pop()!;
        yield* Deferred.succeed(d2, 2);

        deferred_array.push(yield* Deferred.make<number, never>());
        yield* Deferred.await(deferred_array[0]);

        console.log("P! DONE");
    });

    const p2 = Effect.gen(function* () {
        const d1 = deferred_array.pop()!;
        yield* Deferred.succeed(d1, 2);

        deferred_array.push(yield* Deferred.make<number, never>());
        yield* Deferred.await(deferred_array[0]);

        const d3 = deferred_array.pop()!;
        yield* Deferred.succeed(d3, 2);

        console.log("P§ DONE")
    });

    yield* Effect.all(
        [
            p1,
            p2
        ], {
        concurrency: "unbounded"
    })
}).pipe(
    Effect.runPromise
);
