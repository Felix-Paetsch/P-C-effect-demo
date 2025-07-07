import { Effect, pipe, Schema } from "effect";
import { ProtocolErrorR, ProtocolMessageT } from "../../../../messaging/src/protocols/protocol";
import { MessagePartner } from "../message_partner/message_partner";
import { MessagePartnerObject, MessagePartnerObjectIdent } from "../message_partner_object";
import { Protocol } from "../../../../messaging/src/protocols/protocol";
import { ProtocolError } from "../../../../messaging/src/protocols/protocol";

export const MessagePartnerNotFoundMessage = "Message partner not found" as const;
export const MessagePartnerObjectNotFoundMessage = "Message partner object not found" as const;
export const MessagePartnerGotRemovedMessage = "Message partner object was removed" as const;

export function get_message_partner(msg_partner_ident: string): Effect.Effect<MessagePartner, ProtocolError, ProtocolMessageT> {
    return pipe(
        MessagePartner.get_message_partner(msg_partner_ident),
        Effect.catchAll(e => Effect.gen(function* () {
            return yield* new ProtocolErrorR({
                message: MessagePartnerNotFoundMessage,
                error: e,
                Message: yield* ProtocolMessageT
            })
        })),
        Protocol.fail_with_response
    )
}

export function get_message_partner_object(msg_partner_ident: MessagePartnerObjectIdent): Effect.Effect<MessagePartnerObject, ProtocolError, ProtocolMessageT> {
    return pipe(
        Schema.decodeUnknown(MessagePartnerObject.MessagePartnerObjectFromIdent)(msg_partner_ident),
        Effect.catchAll(e => Effect.gen(function* () {
            return yield* new ProtocolErrorR({
                message: MessagePartnerObjectNotFoundMessage,
                error: e,
                Message: yield* ProtocolMessageT
            })
        })),
    )
}

export function guard_mpo_still_active(mpo: MessagePartnerObject): Effect.Effect<MessagePartnerObject, ProtocolErrorR, ProtocolMessageT> {
    return Effect.gen(function* () {
        if (mpo.is_removed()) {
            const err = new ProtocolErrorR({
                message: MessagePartnerGotRemovedMessage,
                error: new Error(MessagePartnerGotRemovedMessage),
                Message: yield* ProtocolMessageT
            });
            return yield* err;
        }

        return mpo;
    })
}