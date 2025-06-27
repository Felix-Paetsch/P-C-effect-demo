import { Context, Effect, Option } from "effect";
import { Address } from "../../../../messaging/src/base/address";
import { v4 as uuidv4 } from "uuid";
import { MessagePartnerObject } from "../message_partner_object";
// Import protocol to ensure methods and properties are added to the prototype
import "./protocol";

export class MessagePartner extends MessagePartnerObject {
    static message_partners: MessagePartner[] = [];
    static get_message_partner(uuid: string): Option.Option<MessagePartner> {
        if (uuid.endsWith("_1")) {
            uuid = uuid.slice(0, -2) + "_2";
        } else if (uuid.endsWith("_2")) {
            uuid = uuid.slice(0, -2) + "_1";
        }

        return Option.fromNullable(MessagePartner.message_partners.find(
            mp => mp.uuid === uuid && !mp.is_removed()
        ));
    }

    private message_partner_objects: MessagePartnerObject[] = [];
    constructor(
        readonly address: Address,
        protected _uuid: string = uuidv4()
    ) {
        super(null as any, _uuid);
        this._message_partner = this;

        // Todo: What if accidentally we created it multiple times at the same place?
        const existing_mp = MessagePartner.get_message_partner(this._uuid);
        if (Option.isSome(existing_mp)) {
            existing_mp.value._uuid = this._uuid + "_1";
            this._uuid = this._uuid + "_2";
        }

        MessagePartner.message_partners.push(this);
    }



    ping() { }
    is_alive() { }

    is_removed(): boolean {
        return this.removed;
    }

    register_message_partner_object(mpo: MessagePartnerObject) {
        if (!(mpo instanceof MessagePartner)) {
            this.message_partner_objects.push(mpo);
        }
    }

    get_message_partner_object(uuid: string): Option.Option<MessagePartnerObject> {
        if (uuid.endsWith("_1")) {
            uuid = uuid.slice(0, -2) + "_2";
        } else if (uuid.endsWith("_2")) {
            uuid = uuid.slice(0, -2) + "_1";
        }

        if (this.uuid === uuid) {
            return Option.some(this);
        }

        return Option.fromNullable(this.message_partner_objects.find(
            mp => mp.uuid === uuid
        ));
    }
}

export class MessagePartnerT extends Context.Tag("MessagePartnerT")<MessagePartnerT, MessagePartner>() { }