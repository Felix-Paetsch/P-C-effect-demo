type PluginCommunicator = string;
type KernelCommunicator = string;

export class PluginKernelProtocol extends Protocol<PluginCommunicator, KernelCommunicator> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }
}

export const InternalCommunication = new InternalCommunicationProtocol();