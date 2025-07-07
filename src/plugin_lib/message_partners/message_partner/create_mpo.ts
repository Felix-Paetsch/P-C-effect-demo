import { MessagePartnerObject } from "../message_partner_object";
import { Deferred, Effect, Either } from "effect";
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
        console.log("A");
        const imE = yield* messagePartner._send_first_internal_message(command, data);
        console.log("B");
        const im = yield* imE;
        console.log("C");
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

        console.log("D");
        const imE2 = yield* im.respond("OK", 1000000);
        console.log("E");
        // yield* imE2.respond("Ok", 10000);
        console.log("F");

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
        console.log("R");
        const responseE = yield* im.respond(uuid, 1000000);
        yield* responseE;
        //yield* responseE.pipe(promisify);
        //Promise.resolve().then(() => {
        //    return Effect.gen(function* () {
        console.log("S");

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

        console.log("T");
        // yield* responseE;
        console.log("U");

        cb(mpo_object.right);
        //    }).pipe(
        //        Effect.runPromise
        //    )
        //});
    })
}