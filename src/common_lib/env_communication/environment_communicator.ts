import { Effect } from "effect";
import { Address } from "../../../messaging/src/base/address";
import { Environment, EnvironmentT } from "../../../messaging/src/base/environment";
import { ProtocolError, ProtocolErrorN } from "../../../messaging/src/protocols/base/protocol_errors";
import { Json } from "../../../messaging/src/utils/json";
import { EnvironmentCommunicationHandler } from "./EnvironmentCommunicationHandler";
import { EnvironmentCommunicationProtocol } from "./protocol";

export abstract class EnvironmentCommunicator {
    private protocol: EnvironmentCommunicationProtocol;

    constructor(
        protected env: Environment
    ) {
        this.protocol = new EnvironmentCommunicationProtocol(this);
    }

    protected _send_command(
        target_address: Address,
        command: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<
        Effect.Effect<EnvironmentCommunicationHandler, ProtocolErrorN>,
        ProtocolErrorN,
        EnvironmentT
    > {
        return this.protocol.run_command(target_address, command, data, timeout);
    }

    /**
     * Override this method to handle incoming commands
     */
    _receive_command(
        command: string,
        data: Json,
        handler: EnvironmentCommunicationHandler
    ): Effect.Effect<void, ProtocolError> {
        return Effect.fail(new ProtocolErrorN({
            message: `Unknown command: ${command}`,
            data: { command, data }
        }));
    }

    /**
     * Get the protocol instance for setting up middleware
     */
    get_protocol(): EnvironmentCommunicationProtocol {
        return this.protocol;
    }
}