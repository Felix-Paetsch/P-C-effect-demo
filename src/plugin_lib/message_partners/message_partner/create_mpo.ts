import { MessagePartnerObject } from "../message_partner_object";
import { Effect, Either } from "effect";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/base/message";
import { InternalMessage } from "../internal_communication/internal_message";
import { v4 as uuidv4 } from 'uuid';
import { MessagePartner } from "./message_partner";

export function createMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    senderClass: { new(mpo: MessagePartner, uuid: string): T },
    command: string,
    data: Json = null
): Effect.Effect<T, CommunicationError> {
    return Effect.gen(function* () {
        const imE = yield* messagePartner._send_first_internal_message(command, data);
        const im = yield* imE;

        const uuid = im.data as string;
        if (!uuid || typeof uuid !== "string") return yield* new CommunicationErrorR({ message: "Expected uuid", Message: im });

        const mpoE = yield* MessagePartnerObject.make(messagePartner, uuid, senderClass).pipe(
            Effect.either
        );

        if (Either.isLeft(mpoE)) {
            return yield* new CommunicationErrorR({
                message: mpoE.left.message,
                error: mpoE.left.error,
                data,
                Message: im
            });
        }

        const mpo = mpoE.right;

        yield* im.respond("OK", 10000);

        return mpo;
    })
}

export function receiveMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    im: InternalMessage,
    receiverClass: { new(mpo: MessagePartner, uuid: string): T },
    cb: (mpo: T) => void
): Effect.Effect<void, CommunicationError> {
    return Effect.gen(function* () {
        const uuid = uuidv4();
        yield* im.respond(uuid, 50000);

        const mpo_object = yield* MessagePartnerObject.make(messagePartner, uuid, receiverClass).pipe(
            Effect.either
        );

        if (Either.isLeft(mpo_object)) {
            return yield* new CommunicationErrorR({
                message: mpo_object.left.message,
                error: mpo_object.left.error,
                Message: im
            });
        }

        cb(mpo_object.right);
    })
}