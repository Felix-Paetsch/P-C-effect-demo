import { Json } from "../../../messaging/src/base/message"
import { KernelMessage } from "./index"

export type plugin_ident = string | { [key: string]: Json }

export function plugin_request(plugin_ident: plugin_ident): KernelMessage {
    return new KernelMessage("request plugin", { plugin_ident });
}