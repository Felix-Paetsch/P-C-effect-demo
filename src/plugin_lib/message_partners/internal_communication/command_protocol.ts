import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { CommunicationError, CommunicationErrorN, CommunicationErrorR } from "./internal_messages/protocol";
import { Effect } from "effect";
import { Json } from "../../../../messaging/src/base/message";
import { InternalMessage } from "./internal_messages/internal_message";
import { MessagePartnerObject } from "../message_partner_object";

export abstract class CommandProtocol<SenderResult> {
    constructor(
        readonly name: string,

    ) { }

    protected send_first_internal_message(mpo: MessagePartnerObject, data?: Json, timeout?: number): Effect.Effect<
        Effect.Effect<InternalMessage, CommunicationError, EnvironmentT>,
        CommunicationError,
        EnvironmentT
    > {
        return mpo._send_first_internal_message(this.name, data, timeout);
    }

    run(mpo: MessagePartnerObject, data: Json): Effect.Effect<SenderResult, CommunicationError, EnvironmentT> {
        return Effect.fail(new CommunicationErrorN({
            message: `Unimplemented command protocol`,
            data: { protocol: this.name }
        }))
    }

    recieve(mpo: MessagePartnerObject, data: Json, im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        return Effect.fail(new CommunicationErrorR({
            message: `Unimplemented command protocol`,
            data: { protocol: this.name },
            Message: im
        }))
    }
}