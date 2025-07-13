import { Effect, Schema } from "effect";
import { ProtocolCommunicationHandler, ProtocolCommunicationHandlerT } from "../../../../messaging/src/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorR } from "../../../../messaging/src/protocols/base/protocol_errors";
import { InternalMessage } from "./internal_message";

export const InternalMessageProtocolDataSchema = Schema.Struct({
    mpo_ident: Schema.Struct({
        message_partner_uuid: Schema.String,
        uuid: Schema.String
    }),
    internal_message_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export const getInternalMessageProtocolData = Effect.gen(function* () {
    const ch = yield* ProtocolCommunicationHandlerT;
    return yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(ch.data);
}).pipe(
    Effect.catchAll(e => Effect.gen(function* () {
        const ch = yield* ProtocolCommunicationHandlerT;
        return yield* new ProtocolErrorR({
            message: "Invalid request",
            error: e,
            Message: ch.message
        })
    }))
)

export type InternalMessageProtocolData = Schema.Schema.Type<typeof InternalMessageProtocolDataSchema>;
export type InternalMessageResult = Effect.Effect<InternalMessage, ProtocolError>;

export class InternalCommunicationHandler extends ProtocolCommunicationHandler {
    constructor(
        protected commHandler: ProtocolCommunicationHandler
    ) {
        super(commHandler.message);
    }

    get protocol_data(): Effect.Effect<InternalMessageProtocolData, ProtocolError> {
        return Effect.gen(function* () {
            const data = yield* getInternalMessageProtocolData;
            return data;
        }).pipe(Effect.provideService(ProtocolCommunicationHandlerT, this.commHandler))
    }
}