import { Effect, Either } from "effect";
import { MessagePartnerObject } from "../../message_partner_object";
import { MPOProtocol, MPOProtocolError } from "./mpo_protocol";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";
import { MPOMessageT } from "../mpo_message";

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

    get on_first_request(): Effect.Effect<void, MPOProtocolError, MPOMessageT> {
        return Effect.gen(function* (_) {
            const im = yield* _(MPOMessageT);
            return yield* im.respond();
        });
    }
}

export const Ping = new PingProtocol();