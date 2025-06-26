import { Effect } from "effect";
import { ProtocolError, ProtocolErrorN, ProtocolErrorR, ProtocolMessage } from "../../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject, MessagePartnerObjectIdent } from "../../message_partner_object";
import { Json } from "../../../../../messaging/src/base/message";
import { MessagePartnerObjectCommunication } from "../message_partner_object_communication";
import { InternalMessage, InternalMessageT } from "../internal_message";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";

export class MPOProtocolErrorN extends ProtocolErrorN {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        internal_message?: InternalMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            protocol_message: args.internal_message?.pm
        });
    }
}

export class MPOProtocolErrorR extends ProtocolErrorR {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        internal_message: InternalMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            protocol_message: args.internal_message.pm
        });
    }
}

export type MPOProtocolError = MPOProtocolErrorR | MPOProtocolErrorN;

// A protocol to run on one message partner that communicates with its associated message partner
export class MPOProtocol<SenderResult, ReceiverResult> {
    constructor(
        readonly name: string,
        readonly version: string,
        readonly call_on_reciever?: string
    ) {
        MessagePartnerObjectCommunication.add_mpo_protocol(this);
    }

    static not_implemented_error = Effect.gen(function* (_) {
        const message = yield* _(InternalMessageT);
        return yield* Effect.fail(new MPOProtocolErrorR(
            {
                message: "Not implemented",
                data: {},
                internal_message: message
            }
        ))
    })

    protected send_first_message(mpo: MessagePartnerObject, data: Json): Effect.Effect<InternalMessage, MPOProtocolErrorN, EnvironmentT> {
        return MessagePartnerObjectCommunication.mpo_run(mpo, this.name, data);
    }

    run(mpo: MessagePartnerObject, data: Json): Effect.Effect<SenderResult, MPOProtocolError, EnvironmentT> {
        return Effect.fail(new MPOProtocolErrorN({
            message: "Not implemented",
            data: {}
        }))
    }

    on_callback(mpo: MessagePartnerObject | MessagePartnerObjectIdent, r: ReceiverResult): Effect.Effect<void, MPOProtocolError, never> {

    }
}