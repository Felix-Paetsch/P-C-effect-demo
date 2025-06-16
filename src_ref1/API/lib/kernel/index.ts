import { TransmittableMessage, Json } from "../../../messaging/src/base/message";
import { Address } from "../../../messaging/src/base/address";
import { Middleware } from "../../../messaging/src/base/middleware";
import { UUID } from "../../../messaging/src/base/uuid";

export function openCommunicationChannel(
    // The address you provide communication to
    address: Address,
    // Call recieve when you recieve a message
    recieve_cb: (on_recieve: (message: TransmittableMessage) => void) => void,
    // Sending a message
    send: (message: TransmittableMessage) => void,
    // Call remove when you remove the communication channel
    remove_cb: (on_remove: () => void) => void,
    // Is called on unresponsiveness
    on_unresponsive: () => void
) { }

export function setLocalAddress(
    local: UUID
) { }