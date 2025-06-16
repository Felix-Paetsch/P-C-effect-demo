import { Address as MAddress } from "../../../messaging/src/base/address"
import { Message, Json } from "../../../messaging/src/base/message"

export class Recipient {
    constructor(
        public address: MAddress,
        public ident: string
    ) { }

    send_message(
        data: {
            body: Json,
            headers: { [key: string]: Json }
        }
    ) {
        new Message(this.address, {
            content: data.body
        }, {
            ...data.headers,
            recipient: this.serialize
        })
    }
}