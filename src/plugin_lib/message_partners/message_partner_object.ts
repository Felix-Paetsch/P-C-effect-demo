import { Context, Effect, ParseResult, pipe, Schema } from "effect";
import { MessagePartner } from "./message_partner/message_partner";
import { CommunicationError, CommunicationErrorN, CommunicationErrorR, InternalCommunication } from "./internal_communication/protocol";
import { EnvironmentT } from "../../../messaging/src/base/environment";
import { InternalMessage } from "./internal_communication/internal_message";
import { Json } from "../../../messaging/src/base/message";

export const MessagePartnerObjectIdentStruct = Schema.Struct({
    message_partner_uuid: Schema.String,
    uuid: Schema.String
})

export type MessagePartnerObjectIdent = Schema.Schema.Type<typeof MessagePartnerObjectIdentStruct>;

export class MessagePartnerObject {
    remove() {
        throw new Error("Method not implemented.");
    }
    protected removed: boolean = false;
    constructor(
        protected _message_partner: MessagePartner,
        protected _uuid: string
    ) {
        this._message_partner?.register_message_partner_object(this);
    }

    get message_partner(): MessagePartner {
        return this._message_partner;
    }

    get uuid(): string {
        return this._uuid;
    }

    get ident(): MessagePartnerObjectIdent {
        return {
            message_partner_uuid: this.message_partner.uuid,
            uuid: this.uuid
        }
    }

    is_removed(): boolean {
        return this.removed || this.message_partner.is_removed();
    }

    _run_protocol(protocol_name: string, data: Json): Effect.Effect<any, CommunicationError, EnvironmentT> {
        const self = this;
        return Effect.fail(new CommunicationErrorN({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name }
        }));
    }

    _send_first_internal_message(protocol: string, data?: Json, timeout?: number): Effect.Effect<
        Effect.Effect<InternalMessage, CommunicationError, EnvironmentT>,
        CommunicationError,
        EnvironmentT
    > {
        return InternalCommunication.run_mpo(this, protocol, data, timeout);
    }

    _recieve_internal_message(protocol_name: string, data: Json, im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        return Effect.fail(new CommunicationErrorR({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name },
            Message: im
        }));
    }

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
        console.log("CREATE", uuid);
        return new this(mpo.message_partner, uuid);
    }
}

export class MessagePartnerObjectT extends Context.Tag("MessagePartnerObjectT")<MessagePartnerObjectT, MessagePartnerObject>() { }