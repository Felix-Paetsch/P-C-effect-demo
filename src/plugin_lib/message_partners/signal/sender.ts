import { MessagePartner } from "../message_partner/message_partner";
import { MessagePartnerObject } from "../message_partner_object";

export class SignalSender extends MessagePartnerObject {
    constructor(mp: MessagePartner) {
        super(mp, "signal_sender");
    }
}