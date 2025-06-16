import { Context, Effect, Either, pipe } from "effect"
import { Message, MessageSerializationError, MessageT } from "../../../messaging/src/base/message"
import { make_message_bidirectional } from "../../../messaging/src/middleware/bi_messages"
import { send } from "../../../messaging/src/base/send"
import Response from "./response/response"
import { MiddlewareError } from "../../../messaging/src/base/middleware"
import { TimeoutError } from "../../../messaging/src/middleware/bi_messages"
import { AddressNotFoundError } from "../../../messaging/src/base/send"
import { onErrorRetryWithOtherCommunicationChannels } from "../../../messaging/src/tools/on_message_channel_error"
import { NoValidCommunicationChannelsError } from "../../../messaging/src/base/communication_channels"

export type RequestMessageData = {
    message: Message,
    response: Either.Either<Message,
        TimeoutError
        | MiddlewareError
        | MessageSerializationError
        | AddressNotFoundError
        | NoValidCommunicationChannelsError
    >
}

export class RequestMessageDataT
    extends Context.Tag("RequestMessageDataT")<RequestMessageDataT, RequestMessageData>() { }

export default class Request {
    constructor() { }

    static send_custom_message =
        Effect.gen(function* (_) {
            const msg: Message = yield* _(MessageT);
            const responseE = make_message_bidirectional(msg);

            const either = yield* _(Effect.all([
                pipe(
                    send,
                    onErrorRetryWithOtherCommunicationChannels
                ),
                responseE
            ]).pipe(
                Effect.andThen(([_, response]) => response),
                Effect.either
            ));

            return yield* _(Response.from_request_message({
                message: msg,
                response: either
            }, {
                from_custom_request: true
            }));
        })
}
