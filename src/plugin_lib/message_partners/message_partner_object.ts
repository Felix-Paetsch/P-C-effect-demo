import { Context, Effect, ParseResult, pipe, Schema } from "effect";
import { MessagePartner } from "./message_partner";

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
    ) { }

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

    /*
    protected internally_send_message(message: Json) {
        return this.message_partner.send_message(message);
    }

    protected internally_receive_message(message: Json) {
        return this.message_partner.receive_message(message);
    }
    */










    /*
        close(): Effect.Effect<void, never, never> {
            return Effect.void
        }
    
        on_close(): Effect.Effect<void, never, never> {
            return Effect.void;
        }
    
        ping(): Effect.Effect<Either.Either<true, ProtocolError>, never, EnvironmentT> {
            return Ping.run(this.message_partner.address, this.ident);
        }
    
        is_alive(): Effect.Effect<Either.Either<boolean, ProtocolError>, never, EnvironmentT> {
            return Ping.run(this.message_partner.address, this.ident).pipe(
                Effect.map(res => {
                    if (Either.isRight(res)) {
                        return res;
                    }
    
                    const err = res.left;
                    if (err.message === MessagePartnerNotFoundMessage) {
                        return Either.right(false);
                    }
    
                    return res;
                })
            );
        }
        */
}

export class MessagePartnerObjectT extends Context.Tag("MessagePartnerObjectT")<MessagePartnerObjectT, MessagePartnerObject>() { }