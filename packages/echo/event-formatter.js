export class EventFormatter {
  constructor(namespace) {
    this.namespace = namespace
  }

  format(event) {
    if (this.namespace === false) return event

    if (['.', '\\'].includes(event.charAt(0))) {
      return event.substring(1)
    } else if (this.namespace) {
      event = this.namespace + '.' + event
    }

    return event.replace(/\./g, '\\')
  }
}
