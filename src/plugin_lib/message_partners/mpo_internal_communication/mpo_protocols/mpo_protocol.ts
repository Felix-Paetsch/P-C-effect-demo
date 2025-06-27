import { Effect, Schema } from "effect";
import { ProtocolErrorN, ProtocolErrorR, ProtocolMessage } from "../../../../../messaging/src/protocols/protocol";
import { MessagePartnerObject, MessagePartnerObjectIdent } from "../../message_partner_object";
import { Json } from "../../../../../messaging/src/base/message";
import { MessagePartnerObjectCommunication } from "../messaging_protocol/message_partner_object_communication";
import { InternalMessage, InternalMessageT } from "../internal_message";
import { EnvironmentT } from "../../../../../messaging/src/base/environment";

export type MPOProtocolError = MPOProtocolErrorR | MPOProtocolErrorN;
export class MPOProtocolErrorN extends ProtocolErrorN {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        readonly Message?: InternalMessage | ProtocolMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            Message: (args.Message as any)?.pm || args.Message
        });
    }
}

export class MPOProtocolErrorR extends ProtocolErrorR {
    constructor(args: {
        message: string,
        data?: Json,
        error?: Error,
        readonly internal_message: InternalMessage | ProtocolMessage
    }) {
        super({
            message: args.message,
            data: args.data,
            error: args.error,
            Message: (args.internal_message as any)?.pm || args.internal_message
        });
    }
}

export function to_mpo_protocol_error(e: Error, msg?: InternalMessage): MPOProtocolError {
    if (e instanceof ProtocolErrorR && msg) {
        return new MPOProtocolErrorR({
            message: e.message,
            error: e,
            data: e.data,
            internal_message: msg
        })
    }

    return new MPOProtocolErrorN({
        message: e.message,
        error: e,
        data: (e as any).data || undefined,
        Message: msg
    })
}

// A protocol to run on one message partner that communicates with its associated message partner
export abstract class MPOProtocol<SenderResult, ReceiverResult> {
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

    protected send_first_message(mpo: MessagePartnerObject, data: Json = null): Effect.Effect<InternalMessage, MPOProtocolErrorN, EnvironmentT> {
        return MessagePartnerObjectCommunication.mpo_run(mpo, this.name, data);
    }

    run(mpo: MessagePartnerObject, data: Json = null): Effect.Effect<SenderResult, MPOProtocolError, EnvironmentT> {
        return Effect.fail(new MPOProtocolErrorN({
            message: "Not implemented",
            data: {}
        }))
    }

    get on_first_request(): Effect.Effect<void, MPOProtocolError, InternalMessageT> {
        return MPOProtocol.not_implemented_error
    }

    on_callback(mpo: MessagePartnerObject | MessagePartnerObjectIdent, r: ReceiverResult): Effect.Effect<void, MPOProtocolError, never> {
        const self = this;

        return Effect.gen(function* (_) {
            let mpo2: MessagePartnerObject;
            if (mpo instanceof MessagePartnerObject) {
                mpo2 = mpo;
            } else {
                mpo2 = yield* Schema.decodeUnknown(MessagePartnerObject.MessagePartnerObjectFromIdent)(mpo);
            }

            if (self.call_on_reciever && typeof mpo2[self.call_on_reciever as keyof MessagePartnerObject] === "function") {
                try {
                    (mpo2 as any)[self.call_on_reciever](r);
                } catch (e) {
                    return yield* Effect.fail(new MPOProtocolErrorN({
                        message: "The on_callback function of the message partner object threw an error",
                        data: {},
                        error: e as Error
                    }));
                }
            }
        }).pipe(Effect.ignore)
    }
}