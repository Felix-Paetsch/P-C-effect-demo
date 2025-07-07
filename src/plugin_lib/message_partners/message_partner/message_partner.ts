import { Context, Option, Effect, Schema, ParseResult, pipe } from "effect";
import { Address } from "../../../../messaging/src/base/address";
import { v4 as uuidv4 } from "uuid";
import { MessagePartnerObject, MPOInitializationError } from "../message_partner_object";
import { createMpo, receiveMpo } from "./create_mpo";
import { CommunicationError, CommunicationErrorR } from "../internal_communication/protocol";
import { Json } from "../../../../messaging/src/base/message";
import { Environment, EnvironmentT } from "../../../../messaging/src/base/environment";
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
        readonly env: Environment,
        uuid: string = uuidv4()
    ) {
        super(null as any, uuid);
        (this.message_partner as any) = this;
        MessagePartner.message_partners.push(this);
    }

    remove() {
        return pipe(
            Effect.all(this.message_partner_objects.map(mpo => mpo.remove())),
            Effect.andThen(super.remove())
        );
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
        if (uuid.charAt(uuid.length - 2) === "_" && uuid.slice(0, -2) === this.uuid.slice(0, -2)) {
            return Option.some(this);
        }
        if (uuid == this.uuid) {
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

    static make = Schema.transformOrFail(
        Schema.Struct({
            address: Schema.instanceOf(Address),
            uuid: Schema.String
        }),
        Schema.instanceOf(MessagePartner),
        {
            encode: (mpo: MessagePartner, _, __) => Effect.succeed({
                address: mpo.address,
                uuid: mpo.uuid
            }),
            decode: ({ uuid, address }, _, ast) => pipe(
                MessagePartner.get_message_partner(uuid),
                Effect.flip,
                Effect.andThen(() => Effect.gen(function* () {
                    const env = yield* EnvironmentT;
                    return new MessagePartner(address, env, uuid);
                })),
                Effect.catchAll(e => {
                    return ParseResult.fail(new ParseResult.Type(ast, { uuid, address }, "Message partner already exists"));
                })
            )
        }
    )

    static makeLocalPair(env1: Environment, env2: Environment, uuid = uuidv4()): Effect.Effect<[MessagePartner, MessagePartner], MPOInitializationError> {
        return Effect.gen(this, function* () {
            for (const mp of this.message_partners) {
                if (mp.uuid === uuid || mp.uuid === uuid + "_1" || mp.uuid === uuid + "_2") {
                    return yield* new MPOInitializationError({
                        message_partner_uuid: uuid,
                        uuid: uuid,
                        error: new Error("Message partners with UUID already exist")
                    })
                }
            }

            return [
                new MessagePartner(env2.ownAddress, env1, uuid + "_1"),
                new MessagePartner(env1.ownAddress, env2, uuid + "_2")
            ] as [MessagePartner, MessagePartner];
        })
    }
}

export class MessagePartnerT extends Context.Tag("MessagePartnerT")<MessagePartnerT, MessagePartner>() { }