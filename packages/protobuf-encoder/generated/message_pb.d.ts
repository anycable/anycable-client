import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace action_cable. */
export namespace action_cable {

    /** Type enum. */
    enum Type {
        no_type = 0,
        welcome = 1,
        disconnect = 2,
        ping = 3,
        confirm_subscription = 4,
        reject_subscription = 5,
        confirm_history = 6,
        reject_history = 7
    }

    /** Command enum. */
    enum Command {
        unknown_command = 0,
        subscribe = 1,
        unsubscribe = 2,
        message = 3,
        history = 4,
        pong = 5,
        whisper = 6
    }

    /** Properties of a StreamHistoryRequest. */
    interface IStreamHistoryRequest {

        /** StreamHistoryRequest epoch */
        epoch?: (string|null);

        /** StreamHistoryRequest offset */
        offset?: (number|null);
    }

    /** Represents a StreamHistoryRequest. */
    class StreamHistoryRequest implements IStreamHistoryRequest {

        /**
         * Constructs a new StreamHistoryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: action_cable.IStreamHistoryRequest);

        /** StreamHistoryRequest epoch. */
        public epoch: string;

        /** StreamHistoryRequest offset. */
        public offset: number;

        /**
         * Creates a new StreamHistoryRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StreamHistoryRequest instance
         */
        public static create(properties?: action_cable.IStreamHistoryRequest): action_cable.StreamHistoryRequest;

        /**
         * Encodes the specified StreamHistoryRequest message. Does not implicitly {@link action_cable.StreamHistoryRequest.verify|verify} messages.
         * @param message StreamHistoryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: action_cable.IStreamHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StreamHistoryRequest message, length delimited. Does not implicitly {@link action_cable.StreamHistoryRequest.verify|verify} messages.
         * @param message StreamHistoryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: action_cable.IStreamHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StreamHistoryRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StreamHistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): action_cable.StreamHistoryRequest;

        /**
         * Decodes a StreamHistoryRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StreamHistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): action_cable.StreamHistoryRequest;

        /**
         * Verifies a StreamHistoryRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StreamHistoryRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StreamHistoryRequest
         */
        public static fromObject(object: { [k: string]: any }): action_cable.StreamHistoryRequest;

        /**
         * Creates a plain object from a StreamHistoryRequest message. Also converts values to other types if specified.
         * @param message StreamHistoryRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: action_cable.StreamHistoryRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StreamHistoryRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StreamHistoryRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a HistoryRequest. */
    interface IHistoryRequest {

        /** HistoryRequest since */
        since?: (number|null);

        /** HistoryRequest streams */
        streams?: ({ [k: string]: action_cable.IStreamHistoryRequest }|null);
    }

    /** Represents a HistoryRequest. */
    class HistoryRequest implements IHistoryRequest {

        /**
         * Constructs a new HistoryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: action_cable.IHistoryRequest);

        /** HistoryRequest since. */
        public since: number;

        /** HistoryRequest streams. */
        public streams: { [k: string]: action_cable.IStreamHistoryRequest };

        /**
         * Creates a new HistoryRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HistoryRequest instance
         */
        public static create(properties?: action_cable.IHistoryRequest): action_cable.HistoryRequest;

        /**
         * Encodes the specified HistoryRequest message. Does not implicitly {@link action_cable.HistoryRequest.verify|verify} messages.
         * @param message HistoryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: action_cable.IHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified HistoryRequest message, length delimited. Does not implicitly {@link action_cable.HistoryRequest.verify|verify} messages.
         * @param message HistoryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: action_cable.IHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HistoryRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): action_cable.HistoryRequest;

        /**
         * Decodes a HistoryRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HistoryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): action_cable.HistoryRequest;

        /**
         * Verifies a HistoryRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a HistoryRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HistoryRequest
         */
        public static fromObject(object: { [k: string]: any }): action_cable.HistoryRequest;

        /**
         * Creates a plain object from a HistoryRequest message. Also converts values to other types if specified.
         * @param message HistoryRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: action_cable.HistoryRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this HistoryRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for HistoryRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Message. */
    interface IMessage {

        /** Message type */
        type?: (action_cable.Type|null);

        /** Message command */
        command?: (action_cable.Command|null);

        /** Message identifier */
        identifier?: (string|null);

        /** Message data */
        data?: (string|null);

        /** Message message */
        message?: (Uint8Array|null);

        /** Message reason */
        reason?: (string|null);

        /** Message reconnect */
        reconnect?: (boolean|null);

        /** Message history */
        history?: (action_cable.IHistoryRequest|null);
    }

    /** Represents a Message. */
    class Message implements IMessage {

        /**
         * Constructs a new Message.
         * @param [properties] Properties to set
         */
        constructor(properties?: action_cable.IMessage);

        /** Message type. */
        public type: action_cable.Type;

        /** Message command. */
        public command: action_cable.Command;

        /** Message identifier. */
        public identifier: string;

        /** Message data. */
        public data: string;

        /** Message message. */
        public message: Uint8Array;

        /** Message reason. */
        public reason: string;

        /** Message reconnect. */
        public reconnect: boolean;

        /** Message history. */
        public history?: (action_cable.IHistoryRequest|null);

        /**
         * Creates a new Message instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Message instance
         */
        public static create(properties?: action_cable.IMessage): action_cable.Message;

        /**
         * Encodes the specified Message message. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: action_cable.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: action_cable.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): action_cable.Message;

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): action_cable.Message;

        /**
         * Verifies a Message message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Message
         */
        public static fromObject(object: { [k: string]: any }): action_cable.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param message Message
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: action_cable.Message, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Message
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Reply. */
    interface IReply {

        /** Reply type */
        type?: (action_cable.Type|null);

        /** Reply identifier */
        identifier?: (string|null);

        /** Reply message */
        message?: (Uint8Array|null);

        /** Reply reason */
        reason?: (string|null);

        /** Reply reconnect */
        reconnect?: (boolean|null);

        /** Reply stream_id */
        stream_id?: (string|null);

        /** Reply epoch */
        epoch?: (string|null);

        /** Reply offset */
        offset?: (number|null);

        /** Reply sid */
        sid?: (string|null);

        /** Reply restored */
        restored?: (boolean|null);

        /** Reply restored_ids */
        restored_ids?: (string[]|null);
    }

    /** Represents a Reply. */
    class Reply implements IReply {

        /**
         * Constructs a new Reply.
         * @param [properties] Properties to set
         */
        constructor(properties?: action_cable.IReply);

        /** Reply type. */
        public type: action_cable.Type;

        /** Reply identifier. */
        public identifier: string;

        /** Reply message. */
        public message: Uint8Array;

        /** Reply reason. */
        public reason: string;

        /** Reply reconnect. */
        public reconnect: boolean;

        /** Reply stream_id. */
        public stream_id: string;

        /** Reply epoch. */
        public epoch: string;

        /** Reply offset. */
        public offset: number;

        /** Reply sid. */
        public sid: string;

        /** Reply restored. */
        public restored: boolean;

        /** Reply restored_ids. */
        public restored_ids: string[];

        /**
         * Creates a new Reply instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Reply instance
         */
        public static create(properties?: action_cable.IReply): action_cable.Reply;

        /**
         * Encodes the specified Reply message. Does not implicitly {@link action_cable.Reply.verify|verify} messages.
         * @param message Reply message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: action_cable.IReply, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Reply message, length delimited. Does not implicitly {@link action_cable.Reply.verify|verify} messages.
         * @param message Reply message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: action_cable.IReply, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Reply message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Reply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): action_cable.Reply;

        /**
         * Decodes a Reply message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Reply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): action_cable.Reply;

        /**
         * Verifies a Reply message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Reply message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Reply
         */
        public static fromObject(object: { [k: string]: any }): action_cable.Reply;

        /**
         * Creates a plain object from a Reply message. Also converts values to other types if specified.
         * @param message Reply
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: action_cable.Reply, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Reply to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Reply
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
