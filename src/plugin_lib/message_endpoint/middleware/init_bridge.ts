import { Effect } from "effect";
import { chain_middleware } from "../../../../messaging/src/middleware/message_chains"
import { incomingMessageEndpoint } from "../incoming_message_endpoint";
import { MessageT } from "../../../../messaging/src/base/message"

/*

    Build on message chains.
    Protocol.start()
    Protocol.middleware()
    Protocol.on()

    bridge_protocol(message_endpoint)
    bridge_protocol.on()

    =========

    // Send, Recieve, Set Up / Preserve Protocoll Format

    Recieve Request ()
    Send Request ()

    Protocol Middleware:
    ( Recive )
    No intermittend middleware
    Optionally have additional should process effect; but mainly check that protocoll id matches

*/

// On first request: 
export const init_bridge = chain_middleware(
    incomingMessageEndpoint.on_first_bridge_request,
    Effect.void,
    MessageT.pipe(
        Effect.andThen(m => m.meta_data.protocol_id === "init_bridge")
    )
);
