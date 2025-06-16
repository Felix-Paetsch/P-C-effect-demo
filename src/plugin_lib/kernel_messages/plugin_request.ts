import { Effect, pipe } from "effect"
import { Json, MessageT } from "../../../messaging/src/base/message"
import { KernelMessage } from "./index"
import Request from "../fetch/request"

export type plugin_ident = string | { [key: string]: Json }
export const plugin_request = (plugin_ident: plugin_ident) =>
    Request.send_custom_message.pipe(Effect.provideServiceEffect(
        MessageT,
        pipe(
            Effect.succeed(new KernelMessage("plugin_request", plugin_ident).message)
        )
    ))
// TODO: Process Response