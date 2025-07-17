import { Address } from "../../../messaging/src/base/address";
import { Environment } from "../../../messaging/src/base/environment";
import { EnvironmentCommunicator } from "../../common_lib/env_communication/environment_communicator";
import applyGetPluginPrototypeModifier from "./commands/get_plugin";


export class PluginEnvironment extends EnvironmentCommunicator {
    constructor(
        readonly env: Environment,
        readonly kernel_address: Address,
        readonly instance_uuid: string, // UUID of the plugin instance
    ) {
        super(env);
        this.command_prefix = "PLUGIN";
    }
}

applyGetPluginPrototypeModifier(PluginEnvironment)