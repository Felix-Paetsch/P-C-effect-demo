import { Context, Effect, ParseResult, pipe, Schema, Option, Data } from "effect";
import { MessagePartner } from "./message_partner/message_partner";
import { CommunicationError, CommunicationErrorR, InternalCommunication } from "./internal_communication/protocol";
import { EnvironmentT } from "../../../messaging/src/base/environment";
import { InternalMessage } from "./internal_communication/internal_message";
import { Json } from "../../../messaging/src/base/message";

export class MPOInitializationError extends Data.TaggedError("MPOInitializationError")<{
    message_partner_uuid: string;
    uuid: string;
    error: Error;
}> { }

export const MessagePartnerObjectIdentStruct = Schema.Struct({
    message_partner_uuid: Schema.String,
    uuid: Schema.String
})

export type MessagePartnerObjectIdent = Schema.Schema.Type<typeof MessagePartnerObjectIdentStruct>;

export class MessagePartnerObject {
    constructor(
        readonly message_partner: MessagePartner,
        readonly uuid: string
    ) {
        // The ? is for MessagePartner initialization
        this.message_partner?.register_message_partner_object(this);
    }

    get ident(): MessagePartnerObjectIdent {
        return {
            message_partner_uuid: this.message_partner.uuid,
            uuid: this.uuid
        }
    }

    remove(): Effect.Effect<void, never, EnvironmentT> {
        return Effect.gen(this, function* () {
            this.removed = true;
            return yield* this._send_first_internal_message("remove_mpo").pipe(Effect.ignore);
        })
    }
    protected removed: boolean = false;
    is_removed(): boolean {
        return this.removed || this.message_partner.is_removed();
    }
    protected on_remove_msg(im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        return Effect.gen(this, function* () {
            this.removed = true;
            return yield* im.respond("OK");
        })
    }

    _send_first_internal_message(protocol: string, data?: Json, timeout?: number): Effect.Effect<
        Effect.Effect<InternalMessage, CommunicationError, EnvironmentT>,
        CommunicationError,
        EnvironmentT
    > {
        return InternalCommunication.run_mpo(this, protocol, data, timeout);
    }

    _recieve_internal_message(protocol_name: string, data: Json, im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        if (protocol_name === "remove_mpo") {
            return this.on_remove_msg(im);
        }

        return Effect.fail(new CommunicationErrorR({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name },
            Message: im
        }));
    }

    static makeMPO = Schema.transformOrFail(
        Schema.Struct({
            message_partner: Schema.suspend(() => Schema.instanceOf(MessagePartner)),
            uuid: Schema.String
        }),
        Schema.instanceOf(MessagePartnerObject),
        {
            encode: (mpo: MessagePartnerObject, _, __) => Effect.succeed({
                message_partner: mpo.message_partner,
                uuid: mpo.uuid
            }),
            decode: ({ uuid, message_partner }, _, ast) => Effect.gen(function* () {
                if (message_partner.is_removed()) {
                    return yield* ParseResult.fail(new ParseResult.Type(ast, { uuid, message_partner }, "Message partner is no longer active"));
                }
                if (Option.isNone(message_partner.get_message_partner_object(uuid))) {
                    return yield* ParseResult.fail(new ParseResult.Type(ast, { uuid, message_partner }, "Uuid already exists on message partner"));
                }
                const mpo = new MessagePartnerObject(message_partner, uuid);
                return mpo;
            })
        }
    )

    static MessagePartnerObjectFromIdent = Schema.transformOrFail(
        MessagePartnerObjectIdentStruct,
        Schema.instanceOf(MessagePartnerObject),
        {
            encode: (msg_partner_object: MessagePartnerObject, _, __) => Effect.succeed(msg_partner_object.ident),
            decode: (ident: MessagePartnerObjectIdent, _, ast) => Effect.suspend(() => pipe(
                MessagePartner.get_message_partner(ident.message_partner_uuid),
                Effect.mapError(e => new ParseResult.Type(
                    ast, ident, `Couln't find message partner`)
                ),
                Effect.andThen(mp => mp.get_message_partner_object(ident.uuid)),
                Effect.catchTag("NoSuchElementException", e => Effect.fail(new ParseResult.Type(
                    ast, ident, `Couln't find message partner object`)
                ))
            ))
        }
    );

    static fromExistingMessagePartnerObject(mpo: MessagePartnerObject, uuid: string) {
        return new this(mpo.message_partner, uuid);
    }
}

export class MessagePartnerObjectT extends Context.Tag("MessagePartnerObjectT")<MessagePartnerObjectT, MessagePartnerObject>() { }