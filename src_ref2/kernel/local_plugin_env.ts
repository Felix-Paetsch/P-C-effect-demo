import { Effect } from "effect";
import { Address } from "../../messaging/src/base/address";
import { MessageT, TransmittableMessage } from "../../messaging/src/base/message";
import { Environment } from "../plugins/environment";
import { send } from "../../messaging/src/base/send";

class LocalPluginEnvironment extends Environment {
    constructor() {
        super(Address.local_address);
    }

    get kernel_address() {
        return Address.local_address
    }

    protected send_messageE(msg: TransmittableMessage): Effect.Effect<void, Error, never> {
        return send.pipe(
            Effect.provideServiceEffect(MessageT, msg.message)
        );
    }
}

const Instance = new LocalPluginEnvironment();
export default Instance;