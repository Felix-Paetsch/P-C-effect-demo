import { Json } from "../../../messaging/src/base/message";
import { MessageEndpoint } from "./message_endpoint";

export default class MessageBridge {
    constructor(
        readonly endpoint: MessageEndpoint,
        readonly id: string,
        readonly meta_data: Json,
    ) { }
}
