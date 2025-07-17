import { Effect } from "effect";
import { Address } from "../../../messaging/src/base/address";
import { Environment, EnvironmentT } from "../../../messaging/src/base/environment";
import { ProtocolError, ProtocolErrorN } from "../../../messaging/src/protocols/base/protocol_errors";
import { Json } from "../../../messaging/src/utils/json";
import { runEffectAsPromise } from "../../../messaging/src/utils/run";
import { EnvironmentCommunicationHandler } from "./EnvironmentCommunicationHandler";
import { EnvironmentCommunicationProtocol } from "./protocol";

export abstract class EnvironmentCommunicator {
    private static classCommands = new Map<Function, {
        [key: string]: {
            command: string;
            on_command: (communicator: any, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
        }
    }>();

    private protocol: EnvironmentCommunicationProtocol;

    constructor(
        protected env: Environment
    ) {
        this.protocol = new EnvironmentCommunicationProtocol(this);
        this.protocol.middleware(env).pipe(
            Effect.andThen(mw => env.useMiddleware(mw)),
            runEffectAsPromise
        );
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

    _receive_command(
        command: string,
        data: Json,
        handler: EnvironmentCommunicationHandler
    ): Effect.Effect<void, ProtocolError> {
        const registeredCommand = (this.constructor as typeof EnvironmentCommunicator).get_command(command);
        if (registeredCommand) {
            return registeredCommand.on_command(this, handler, data);
        }

        return Effect.fail(new ProtocolErrorN({
            message: `Unknown command: ${command}`,
            data: { command, data }
        }));
    }

    private static _initializeClassCommands(classConstructor: Function): void {
        if (!EnvironmentCommunicator.classCommands.has(classConstructor)) {
            EnvironmentCommunicator.classCommands.set(classConstructor, {});
        }
    }

    static add_command<T extends EnvironmentCommunicator = EnvironmentCommunicator>(command: {
        command: string;
        on_command: (communicator: T, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    }): void {
        EnvironmentCommunicator._initializeClassCommands(this);
        const classCommandMap = EnvironmentCommunicator.classCommands.get(this)!;
        classCommandMap[command.command] = command;
    }

    static get_command(commandName: string): {
        command: string;
        on_command: (communicator: EnvironmentCommunicator, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    } | undefined {
        let currentClass: Function = this;
        while (currentClass && currentClass !== Function.prototype) {
            const classCommandMap = EnvironmentCommunicator.classCommands.get(currentClass);
            if (classCommandMap && classCommandMap[commandName]) {
                return classCommandMap[commandName];
            }
            currentClass = Object.getPrototypeOf(currentClass);
        }
        return undefined;
    }

    static get commands() {
        EnvironmentCommunicator._initializeClassCommands(this);
        const classCommandMap = EnvironmentCommunicator.classCommands.get(this)!;
        return Object.values(classCommandMap);
    }
}