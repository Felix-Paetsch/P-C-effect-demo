import { Effect, pipe, Schema } from "effect";
import { ProtocolErrorR, ProtocolMessageT } from "../../../../../messaging/src/protocols/protocol";
import { MessagePartner } from "../../message_partner";
import { MessagePartnerObject, MessagePartnerObjectIdent } from "../../message_partner_object";
import { Protocol } from "../../../../../messaging/src/protocols/protocol";
import { ProtocolError } from "../../../../../messaging/src/protocols/protocol";
import { MPOProtocolDataSchema } from "./message_partner_object_communication";

export const MessagePartnerNotFoundMessage = "Message partner not found" as const;
export const MessagePartnerObjectNotFoundMessage = "Message partner object not found" as const;
export const MessagePartnerGotRemovedMessage = "Message partner object was removed" as const;

export const get_mpo_protocol_data = Effect.gen(function* (_) {
    const msg = yield* _(ProtocolMessageT);
    return yield* Schema.decodeUnknown(MPOProtocolDataSchema)(msg.data);
}).pipe(
    Effect.catchAll(e => Effect.gen(function* (_) {
        return yield* Effect.fail(new ProtocolErrorR({
            message: "Invalid request",
            error: e,
            protocol_message: yield* _(ProtocolMessageT)
        }))
    }))
)

export function get_message_partner(msg_partner_ident: string): Effect.Effect<MessagePartner, ProtocolError, ProtocolMessageT> {
    return pipe(
        MessagePartner.get_message_partner(msg_partner_ident),
        Effect.catchAll(e => Effect.gen(function* (_) {
            return yield* Effect.fail(new ProtocolErrorR({
                message: MessagePartnerNotFoundMessage,
                error: e,
                protocol_message: yield* _(ProtocolMessageT)
            }))
        })),
        Protocol.fail_with_response
    )
}

export function get_message_partner_object(msg_partner_ident: MessagePartnerObjectIdent): Effect.Effect<MessagePartnerObject, ProtocolError, ProtocolMessageT> {
    return pipe(
        Schema.decodeUnknown(MessagePartnerObject.MessagePartnerObjectFromIdent)(msg_partner_ident),
        Effect.catchAll(e => Effect.gen(function* (_) {
            return yield* Effect.fail(new ProtocolErrorR({
                message: MessagePartnerObjectNotFoundMessage,
                error: e,
                protocol_message: yield* _(ProtocolMessageT)
            }))
        })),
    )
}

export function guard_mpo_still_active(mpo: MessagePartnerObject): Effect.Effect<MessagePartnerObject, ProtocolErrorR, ProtocolMessageT> {
    return Effect.gen(function* (_) {
        if (mpo.is_removed()) {
            const err = new ProtocolErrorR({
                message: MessagePartnerGotRemovedMessage,
                error: new Error(MessagePartnerGotRemovedMessage),
                protocol_message: yield* _(ProtocolMessageT)
            });
            return yield* Effect.fail(err);
        }

        return mpo;
    })
}