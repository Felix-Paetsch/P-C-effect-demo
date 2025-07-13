import { Effect, Schema } from "effect";
import { ProtocolCommunicationHandler } from "../../../../messaging/src/protocols/base/communicationHandler";
import { Json } from "../../../../messaging/src/utils/json";

export type InternalMessage = ProtocolMessage && any
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
    // TODO: On initialization, check if we actually adhere. If so, make the data the correct thing
    // On send and so on, check that the data is still correct (and make the data be correct)

    constructor(
        protected im: InternalMessage,
    ) {
        super(im);
    }

    get data(): InternalMessageProtocolData {
        return this.current_pm.data;
    }

    get protocol_data(): Json {
        return this.data.protocol_data;
    }

    static fromProtocolMessage(pm: ProtocolMessage): Effect.Effect<InternalCommunicationHandler, ProtocolError> {
        return Effect.gen(function* () {
            const data = yield* Schema.decodeUnknown(InternalMessageProtocolDataSchema)(pm.data);
            return new InternalCommunicationHandler(pm);
        })
    }
}