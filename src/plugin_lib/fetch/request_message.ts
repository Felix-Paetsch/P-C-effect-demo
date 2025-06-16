import { Context, Effect, Schema } from "effect";
import { Address } from "../../../messaging/src/base/address";
import { CommunicationChannel } from "../../../messaging/src/base/communication_channels";
import { Json, Message } from "../../../messaging/src/base/message";

export class RequestMessageT extends Context.Tag("RequestMessageT")<RequestMessageT, RequestMessage>() { }
export class RequestMessage extends Message {
    constructor(
        public target: Address,
        content: string | { [key: string]: Json },
        public meta_data: {
            headers: {
                message_type: string,
                [key: string]: string
            },
            [key: string]: Json
        },
        public prefered_communication_channel: CommunicationChannel | null = null
    ) {
        super(target, content, meta_data, prefered_communication_channel);
    }
}

export const toStringJsonRecord = (err_fun: (error: Error) => Error) =>
    (body: Json) => Schema.decodeUnknown(
        Schema.Record({
            key: Schema.String,
            value: Schema.Any
        })
    )(body).pipe(
        Effect.catchAll(
            error => Effect.fail(err_fun(error))
        )
    )