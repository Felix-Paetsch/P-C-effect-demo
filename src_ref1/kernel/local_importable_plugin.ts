import { Address, LocalAddress } from "../../messaging/src/base/address";
import Environment from "../plugin_lib/env";
import { Recipient } from "../plugin_lib/recipient/recipient";

type onCommunicationChannelReady = (env: Environment) => void

export function create_local_importable_plugin(
    on: onCommunicationChannelReady
) {
    const env = new Environment(
        new LocalAddress()
    );
    on(env);
}