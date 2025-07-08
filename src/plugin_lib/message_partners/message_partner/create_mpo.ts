import { MessagePartnerObject } from "../message_partner_object";
import { Effect, Either } from "effect";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/utils/json";
import { InternalMessage } from "../internal_communication/internal_message";
import { v4 as uuidv4 } from 'uuid';
import { MessagePartner } from "./message_partner";
import { InternalCommunicationHandler } from "../internal_communication/internalCommunicationHandler";

export function createMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    senderClass: { new(mpo: MessagePartner, uuid: string): T },
    command: string,
    data: Json = null
): Effect.Effect<T, CommunicationError> {
    return Effect.gen(function* () {
        const im = yield* yield* messagePartner._send_command(command, data);
        const uuid = im.data as string;

        if (!uuid || typeof uuid !== "string") return yield* im.errorR({ message: "Expected uuid" });
        const mpo = yield* MessagePartnerObject.make(messagePartner, uuid, senderClass).pipe(
            Effect.mapError(e => im.asErrorR(e))
        );
        im.onMessageError(mpo.remove());

        yield* im.awaitResponse("OK");
        const confirmationData = im.data as string;

        if (confirmationData !== "OK") {
            return yield* im.errorR({
                message: "Did not receive ok confirmation from receiver",
                data: confirmationData
            });
        }

        yield* im.finishExternal();
        return mpo;
    })
}

export function receiveMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    im: InternalCommunicationHandler,
    receiverClass: { new(mpo: MessagePartner, uuid: string): T },
    cb: (mpo: T) => void
): Effect.Effect<void, CommunicationError> {
    return Effect.gen(function* () {
        const uuid = uuidv4();
        yield* im.awaitResponse(uuid);
        const okData = im.data as string;
        if (okData !== "OK") {
            return yield* im.errorR({
                message: "Did not receive ok from sender",
                data: okData
            });
        }

        const mpo_object = yield* MessagePartnerObject.make(messagePartner, uuid, receiverClass).pipe(
            Effect.mapError(e => im.asErrorR(e))
        );

        cb(mpo_object);
        yield* im.close();
    })
}