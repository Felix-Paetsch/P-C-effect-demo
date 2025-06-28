import { Context, Option, Effect, Schema } from "effect";
import { Address } from "../../../../messaging/src/base/address";
import { v4 as uuidv4 } from "uuid";
import { MessagePartnerObject } from "../message_partner_object";
import { createMpo, receiveMpo, MPOCommand } from "./create_mpo";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/base/message";
import { EnvironmentT } from "../../../../messaging/src/base/environment";
import { InternalMessage } from "../internal_communication/internal_message";
import { Bridge } from "../bridge/bridge";

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

    // Protocol routing for receiving messages
    _recieve_internal_message(protocol_name: string, data: Json, im: InternalMessage): Effect.Effect<void, CommunicationError, EnvironmentT> {
        if (protocol_name === "create_mpo") {
            return receiveMpo(this, data, im);
        }

        return Effect.fail(new CommunicationErrorR({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name },
            Message: im
        }));
    }

    branch(data: Json = null): Effect.Effect<MessagePartnerObject, CommunicationError, EnvironmentT> {
        return createMpo(this, "create_message_partner", data);
    }
    protected branch_cb: null | ((receiverClass: MessagePartnerObject, data?: Json) => void) = null;
    on_branch(callback: null | ((receiverClass: MessagePartnerObject, data?: Json) => void)): void {
        this.branch_cb = callback;
    }

    bridge(data: Json = null): Effect.Effect<Bridge, CommunicationError, EnvironmentT> {
        return createMpo(this, "create_bridge", data) as Effect.Effect<Bridge, CommunicationError, EnvironmentT>;
    }
    protected bridge_cb: null | ((receiverClass: Bridge, data?: Json) => void) = null;
    on_bridge(callback: null | ((receiverClass: Bridge, data?: Json) => void)): void {
        this.bridge_cb = callback;
    }
}

export class MessagePartnerT extends Context.Tag("MessagePartnerT")<MessagePartnerT, MessagePartner>() { }