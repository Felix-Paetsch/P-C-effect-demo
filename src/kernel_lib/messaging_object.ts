import { Address } from "../../messaging/src/base/address";
import { Environment } from "../../messaging/src/base/environment";
import { Json } from "../plugin_lib/utils/json";
import { KernelEnv } from "../../messaging/src/base/kernel_environment/index";

export abstract class KernelMessagingObject {
    constructor(
        readonly env: Environment = KernelEnv
    ) {
    }

    abstract get_plugin(plugin_ident: Json): Address | Error;
}