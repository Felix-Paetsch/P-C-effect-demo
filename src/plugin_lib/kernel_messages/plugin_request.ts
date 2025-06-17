import { Data, Effect, pipe } from "effect"
import { Json } from "../../../messaging/src/base/message"
import { KernelMessage } from "./index"
import Request from "../fetch/request"
import { RequestMessageT, toStringJsonRecord } from "../fetch/request_message"
import { MessageEndpoint } from "../message_endpoint/message_endpoint"
import { Option } from "effect"
import { MalformattedResponseError, PossibleResponseError } from "../fetch/response"

export class PluginRequestError extends Data.TaggedError("PluginRequestError")<{
    error: Error;
}> { }

export type plugin_ident = string | { [key: string]: Json }
export const plugin_request = (plugin_ident: plugin_ident) =>
    Request.send_message.pipe(
        Effect.provideServiceEffect(
            RequestMessageT,
            pipe(
                Effect.succeed(new KernelMessage("plugin_request", plugin_ident).message)
            )
        ),
        Effect.andThen(
            response => response.body.pipe(
                Effect.orElseFail(() => response.err.pipe(
                    Option.getOrThrow
                ))
            )
        ),
        Effect.andThen(
            toStringJsonRecord(error => new MalformattedResponseError({
                error_message: "Invalid response body",
                error: error
            }) as PossibleResponseError)
        ),
        Effect.andThen(body => MessageEndpoint.from_json(
            body.plugin_partner_ident
        )),
        Effect.andThen(endpoint => endpoint.to_outgoing_message_endpoint),
        Effect.catchTag("MessageEndpointDeserializationError", error => Effect.fail(new MalformattedResponseError({
            error_message: "Invalid message partner",
            error: error
        }) as PossibleResponseError)),
        Effect.catchAll(error => Effect.fail(new PluginRequestError({
            error: error
        })))
    )