import { InternalMessage } from "./internal_message";
import { Json } from "../../../../messaging/src/utils/json";
import { CommunicationErrorN, CommunicationErrorR } from "./protocol";
import { Effect } from "effect";

export class InternalCommunicationHandler {
    constructor(
        protected current_im: InternalMessage
    ) { }

    send(data: Json, timeout?: number) {
        return Effect.gen(this, function* () {
            const imE = yield* this.current_im.respond(data, timeout);
            return imE.pipe(
                Effect.andThen(im => {
                    this.current_im = im;
                    return im;
                }),
                Effect.as(this),
                Effect.onError(e => this.cleanUp())
            );
        }).pipe(
            Effect.onError(e => this.cleanUp())
        )
    }

    finishExternal(data: Json = "OK") {
        return this.send(data, 0)
    }

    close(data: Json = "OK") {
        return this.current_im.respond(data, 0)
    }

    awaitResponse(data: Json, timeout?: number) {
        return Effect.gen(this, function* () {
            const im = yield* yield* this.current_im.respond(data, timeout);
            this.current_im = im;
            return this;
        }).pipe(
            Effect.onError(e => this.cleanUp())
        )
    }

    private cleanUp() {
        return Effect.all(this.error_handlers).pipe(Effect.andThen(() => Effect.void))
    }
    private error_handlers: Effect.Effect<void, never, never>[] = [];
    onMessageError(e: Effect.Effect<void, never, never>) {
        this.error_handlers.push(e);
    }

    get data(): Json {
        return this.current_im.data;
    }

    errorN(obj: {
        message: string;
        data?: Json;
        error?: Error
    }) {
        return new CommunicationErrorN({
            message: obj.message,
            data: obj.data,
            error: obj.error
        })
    }
    errorR(obj: {
        message: string;
        data?: Json;
        error?: Error
    }) {
        return new CommunicationErrorR({
            message: obj.message,
            data: obj.data,
            error: obj.error,
            Message: this.current_im
        })
    }
    asErrorR<E extends Error>(err: E) {
        return this.errorR({
            message: err.message,
            data: (err as any).data || null,
            error: err
        })
    }
    asErrorN<E extends Error>(err: E) {
        return this.errorN({
            message: err.message,
            data: (err as any).data || null,
            error: err
        })
    }
}