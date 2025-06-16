import { Effect } from "effect"
import { Json } from "../../messaging/src/base/message"

export class MessagePartner {
    constructor() { }

    static establish_bidirectional_connection = () => { }
    static send_message = (data: Json) => { }

    static from_json = (data: Json) =>
        Effect.gen(function* (_) {
            return new MessagePartner();
        })
}