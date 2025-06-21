import { Json } from "../../../messaging/src/base/message";
import { MessageEndpoint } from "./message_endpoint";

export class OutgoingMessageEndpoint extends MessageEndpoint {
    /*
        Returns a bridge (option) and creates a britch on the other side and calls the callback
    */
    make_bridge = (data: Json) => {
        // => Message chain primitive
        // send a message to the other address, saying I want to have a bridge
        // tell its the local id here
        // it sends a message back
        // we answer
        // both instanciate
    }
}