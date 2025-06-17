import MessageBridge from "./message_bridge";
import { MessageEndpoint } from "./message_endpoint";
import { Environment } from "../environment";

export class IncommingMessageEndpoint extends MessageEndpoint {
    constructor(
        readonly env: Environment,
        readonly id: string
    ) {
        super(env.address, id);
    }

    on_bridge(bridge: MessageBridge) {

    }
}