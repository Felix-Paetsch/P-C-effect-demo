import { MessagePartner } from "./message_partner";
import { MessagePartnerObject } from "./message_partner_object";

export class Bridge extends MessagePartnerObject {
    send(data: Json) {
        return this.send_internal({
            protocol: "send_bridge",
            data
        });
    }

    on_internal_message(res: {
        protocol: string,
        data: Json
    }) {
        if (res.protocol === "send_bridge") {
            this.on_recieve(res.data);
        }
    }
}