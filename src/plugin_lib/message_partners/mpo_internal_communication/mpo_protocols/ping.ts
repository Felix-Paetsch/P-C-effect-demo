import { Effect, Either } from "effect";
import { MessagePartnerObject } from "../../message_partner_object";
import { MPOProtocol, MPOProtocolError } from "./mpo_protocol";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { InternalMessageT } from "../internal_message";

class PingProtocol extends MPOProtocol<Either.Either<boolean, MPOProtocolError>, void> {
    constructor() {
        super("ping", "1.0.0");
    }

    run(mpo: MessagePartnerObject): Effect.Effect<Either.Either<boolean, MPOProtocolError>, never, EnvironmentT> {
        return this.send_first_message(mpo).pipe(
            Effect.as(true as const),
            Effect.either
        );
    }

    get on_first_request(): Effect.Effect<void, MPOProtocolError, InternalMessageT> {
        return Effect.gen(function* (_) {
            const im = yield* _(InternalMessageT);
            return yield* im.respond();
        });
    }
}

export const Ping = new PingProtocol();