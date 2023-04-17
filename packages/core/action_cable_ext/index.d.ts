import { ActionCableProtocol, Options } from '../action_cable/index.js'

export type ExtendedOptions =
  | Partial<{
      // Initial timestamp to use when requesting stream history during subscription
      historyTimestamp: number
    }>
  | Options

export class ActionCableExtendedProtocol extends ActionCableProtocol {
  constructor(opts?: ExtendedOptions)
}
