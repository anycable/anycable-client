import { ActionCableProtocol, Options } from '../action_cable/index.js'

export type ExtendedOptions =
  | Partial<{
      // Initial timestamp to use when requesting stream history during subscription
      historyTimestamp: number | false
      // Enable PONGs
      pongs: boolean
      // Disable session recovery completely
      disableSessionRecovery: boolean
    }>
  | Options

export class ActionCableExtendedProtocol extends ActionCableProtocol {
  constructor(opts?: ExtendedOptions)
}
