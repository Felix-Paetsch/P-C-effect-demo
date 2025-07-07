import { MessagePartnerObject, MPOInitializationError } from "../message_partner_object";
import { Effect, Either } from "effect";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/base/message";
import { InternalMessage } from "../internal_communication/internal_message";
import { v4 as uuidv4 } from 'uuid';
import { MessagePartner } from "./message_partner";

export function createMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    senderClass: { fromExistingMessagePartnerObject: (mpo: MessagePartner, uuid: string) => Effect.Effect<T, MPOInitializationError> },
    command: string,
    data: Json = null
): Effect.Effect<T, CommunicationError> {
    return Effect.gen(function* () {
        console.log("EEE GET TO HERE");
        const imE = yield* messagePartner._send_first_internal_message(command, data);
        console.log("DDD GET TO HERE");
        const im = yield* imE;
        console.log("CCC GET TO HERE");

        const uuid = im.data as string;
        if (!uuid || typeof uuid !== "string") return yield* new CommunicationErrorR({ message: "Expected uuid", Message: im });

        const mpoE = yield* senderClass.fromExistingMessagePartnerObject(messagePartner, uuid).pipe(
            Effect.either
        );

        console.log("BBB GET TO HERE");
        if (Either.isLeft(mpoE)) {
            return yield* new CommunicationErrorR({
                message: mpoE.left.message,
                error: mpoE.left.error,
                data,
                Message: im
            });
        }

        const mpo = mpoE.right;

        console.log("AAA GET TO HERE");
        const _ = yield* im.respond("OK", 10000).pipe(
            Effect.tapError(() => mpo.remove()),
            Effect.flatMap((imE) => imE.pipe(
                Effect.tapError(() => mpo.remove())
            ))
        )

        return mpo;
    })
}

export function receiveMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    im: InternalMessage,
    receiverClass: { fromExistingMessagePartnerObject: (mpo: MessagePartner, uuid: string) => Effect.Effect<T, MPOInitializationError> },
    cb: (mpo: T) => void
): Effect.Effect<void, CommunicationError> {
    return Effect.gen(function* () {
        const uuid = uuidv4();
        console.log("!!!!!!!!!!!!!1111111");
        const okResponseE = yield* im.respond(uuid, 50000);
        console.log("!!!!!!!!!!!!!2222222");
        const okResponse = yield* okResponseE;
        console.log("!!!!!!!!!!!!!3333333");
        const mpo_object = yield* receiverClass.fromExistingMessagePartnerObject(messagePartner, uuid).pipe(
            Effect.either
        );

        if (Either.isLeft(mpo_object)) {
            return yield* new CommunicationErrorR({
                message: mpo_object.left.message,
                error: mpo_object.left.error,
                Message: okResponse
            });
        } else {
            yield* okResponse.respond("OK", 0);
        }

        cb(mpo_object.right);
    });
}