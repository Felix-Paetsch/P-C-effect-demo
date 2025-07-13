import { Effect, Schema } from "effect";
import { ProtocolCommunicationHandler } from "../../../../messaging/src/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorR } from "../../../../messaging/src/protocols/base/protocol_errors";
import { ProtocolMessage } from "../../../../messaging/src/protocols/base/protocol_message";
import { Json } from "../../../../messaging/src/utils/json";

export type InternalMessage = ProtocolMessage & {
    data: InternalMessageProtocolData
}

export const InternalMessageProtocolDataSchema = Schema.Struct({
    mpo_ident: Schema.Struct({
        message_partner_uuid: Schema.String,
        uuid: Schema.String
    }),
    internal_message_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export type InternalMessageProtocolData = Schema.Schema.Type<typeof InternalMessageProtocolDataSchema>;
export class InternalCommunicationHandler extends ProtocolCommunicationHandler {
    constructor(
        protected im: InternalMessage,
    ) {
        super(im);
    }

    respond(data: Json, timeout?: number) {
        return super.respond(Schema.encodeSync(InternalMessageProtocolDataSchema)({
            mpo_ident: this.data.mpo_ident,
            internal_message_protocol_name: this.data.internal_message_protocol_name,
            protocol_data: data
        }), timeout).pipe(
            Effect.map(pmE => pmE.pipe(
                Effect.andThen(pm => Effect.gen(this, function* () {
                    yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(pm.data);
                    this.__current_pm = pm;
                    return pm;
                }).pipe(
                    Effect.mapError(e => new ProtocolErrorR({
                        message: "Invalid internal message",
                        data: pm.data,
                        error: e,
                        Message: pm
                    }))
                ))
            ))
        )
    }

    get data(): InternalMessageProtocolData {
        return (this.__current_pm as any).data;
    }

    get protocol_data(): Json {
        return this.data.protocol_data;
    }

    static fromInternalMessage(im: ProtocolMessage): Effect.Effect<InternalCommunicationHandler, ProtocolError> {
        return Effect.gen(function* () {
            yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(im.data);
            return new InternalCommunicationHandler(im as any);
        }).pipe(
            Effect.mapError(e => new ProtocolErrorR({
                message: "Invalid internal message",
                data: im.data,
                error: e,
                Message: im
            }))
        )
    }
}