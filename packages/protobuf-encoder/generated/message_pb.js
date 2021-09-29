/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const action_cable = $root.action_cable = (() => {

    /**
     * Namespace action_cable.
     * @exports action_cable
     * @namespace
     */
    const action_cable = {};

    /**
     * Type enum.
     * @name action_cable.Type
     * @enum {number}
     * @property {number} no_type=0 no_type value
     * @property {number} welcome=1 welcome value
     * @property {number} disconnect=2 disconnect value
     * @property {number} ping=3 ping value
     * @property {number} confirm_subscription=4 confirm_subscription value
     * @property {number} reject_subscription=5 reject_subscription value
     */
    action_cable.Type = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "no_type"] = 0;
        values[valuesById[1] = "welcome"] = 1;
        values[valuesById[2] = "disconnect"] = 2;
        values[valuesById[3] = "ping"] = 3;
        values[valuesById[4] = "confirm_subscription"] = 4;
        values[valuesById[5] = "reject_subscription"] = 5;
        return values;
    })();

    /**
     * Command enum.
     * @name action_cable.Command
     * @enum {number}
     * @property {number} unknown_command=0 unknown_command value
     * @property {number} subscribe=1 subscribe value
     * @property {number} unsubscribe=2 unsubscribe value
     * @property {number} message=3 message value
     */
    action_cable.Command = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "unknown_command"] = 0;
        values[valuesById[1] = "subscribe"] = 1;
        values[valuesById[2] = "unsubscribe"] = 2;
        values[valuesById[3] = "message"] = 3;
        return values;
    })();

    action_cable.Message = (function() {

        /**
         * Properties of a Message.
         * @memberof action_cable
         * @interface IMessage
         * @property {action_cable.Type|null} [type] Message type
         * @property {action_cable.Command|null} [command] Message command
         * @property {string|null} [identifier] Message identifier
         * @property {string|null} [data] Message data
         * @property {Uint8Array|null} [message] Message message
         * @property {string|null} [reason] Message reason
         * @property {boolean|null} [reconnect] Message reconnect
         */

        /**
         * Constructs a new Message.
         * @memberof action_cable
         * @classdesc Represents a Message.
         * @implements IMessage
         * @constructor
         * @param {action_cable.IMessage=} [properties] Properties to set
         */
        function Message(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Message type.
         * @member {action_cable.Type} type
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.type = 0;

        /**
         * Message command.
         * @member {action_cable.Command} command
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.command = 0;

        /**
         * Message identifier.
         * @member {string} identifier
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.identifier = "";

        /**
         * Message data.
         * @member {string} data
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.data = "";

        /**
         * Message message.
         * @member {Uint8Array} message
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.message = $util.newBuffer([]);

        /**
         * Message reason.
         * @member {string} reason
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.reason = "";

        /**
         * Message reconnect.
         * @member {boolean} reconnect
         * @memberof action_cable.Message
         * @instance
         */
        Message.prototype.reconnect = false;

        /**
         * Creates a new Message instance using the specified properties.
         * @function create
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage=} [properties] Properties to set
         * @returns {action_cable.Message} Message instance
         */
        Message.create = function create(properties) {
            return new Message(properties);
        };

        /**
         * Encodes the specified Message message. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @function encode
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.command);
            if (message.identifier != null && Object.hasOwnProperty.call(message, "identifier"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.identifier);
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.data);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.message);
            if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.reason);
            if (message.reconnect != null && Object.hasOwnProperty.call(message, "reconnect"))
                writer.uint32(/* id 7, wireType 0 =*/56).bool(message.reconnect);
            return writer;
        };

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link action_cable.Message.verify|verify} messages.
         * @function encodeDelimited
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof action_cable.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {action_cable.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.action_cable.Message();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.type = reader.int32();
                    break;
                case 2:
                    message.command = reader.int32();
                    break;
                case 3:
                    message.identifier = reader.string();
                    break;
                case 4:
                    message.data = reader.string();
                    break;
                case 5:
                    message.message = reader.bytes();
                    break;
                case 6:
                    message.reason = reader.string();
                    break;
                case 7:
                    message.reconnect = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof action_cable.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {action_cable.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Message message.
         * @function verify
         * @memberof action_cable.Message
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                }
            if (message.command != null && message.hasOwnProperty("command"))
                switch (message.command) {
                default:
                    return "command: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                if (!$util.isString(message.identifier))
                    return "identifier: string expected";
            if (message.data != null && message.hasOwnProperty("data"))
                if (!$util.isString(message.data))
                    return "data: string expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!(message.message && typeof message.message.length === "number" || $util.isString(message.message)))
                    return "message: buffer expected";
            if (message.reason != null && message.hasOwnProperty("reason"))
                if (!$util.isString(message.reason))
                    return "reason: string expected";
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                if (typeof message.reconnect !== "boolean")
                    return "reconnect: boolean expected";
            return null;
        };

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof action_cable.Message
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {action_cable.Message} Message
         */
        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.action_cable.Message)
                return object;
            let message = new $root.action_cable.Message();
            switch (object.type) {
            case "no_type":
            case 0:
                message.type = 0;
                break;
            case "welcome":
            case 1:
                message.type = 1;
                break;
            case "disconnect":
            case 2:
                message.type = 2;
                break;
            case "ping":
            case 3:
                message.type = 3;
                break;
            case "confirm_subscription":
            case 4:
                message.type = 4;
                break;
            case "reject_subscription":
            case 5:
                message.type = 5;
                break;
            }
            switch (object.command) {
            case "unknown_command":
            case 0:
                message.command = 0;
                break;
            case "subscribe":
            case 1:
                message.command = 1;
                break;
            case "unsubscribe":
            case 2:
                message.command = 2;
                break;
            case "message":
            case 3:
                message.command = 3;
                break;
            }
            if (object.identifier != null)
                message.identifier = String(object.identifier);
            if (object.data != null)
                message.data = String(object.data);
            if (object.message != null)
                if (typeof object.message === "string")
                    $util.base64.decode(object.message, message.message = $util.newBuffer($util.base64.length(object.message)), 0);
                else if (object.message.length)
                    message.message = object.message;
            if (object.reason != null)
                message.reason = String(object.reason);
            if (object.reconnect != null)
                message.reconnect = Boolean(object.reconnect);
            return message;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof action_cable.Message
         * @static
         * @param {action_cable.Message} message Message
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.type = options.enums === String ? "no_type" : 0;
                object.command = options.enums === String ? "unknown_command" : 0;
                object.identifier = "";
                object.data = "";
                if (options.bytes === String)
                    object.message = "";
                else {
                    object.message = [];
                    if (options.bytes !== Array)
                        object.message = $util.newBuffer(object.message);
                }
                object.reason = "";
                object.reconnect = false;
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.action_cable.Type[message.type] : message.type;
            if (message.command != null && message.hasOwnProperty("command"))
                object.command = options.enums === String ? $root.action_cable.Command[message.command] : message.command;
            if (message.identifier != null && message.hasOwnProperty("identifier"))
                object.identifier = message.identifier;
            if (message.data != null && message.hasOwnProperty("data"))
                object.data = message.data;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = options.bytes === String ? $util.base64.encode(message.message, 0, message.message.length) : options.bytes === Array ? Array.prototype.slice.call(message.message) : message.message;
            if (message.reason != null && message.hasOwnProperty("reason"))
                object.reason = message.reason;
            if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                object.reconnect = message.reconnect;
            return object;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof action_cable.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Message;
    })();

    return action_cable;
})();

export { $root as default };
