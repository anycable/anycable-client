export interface ClientOptions {}

declare class Client {
  constructor(url: string, opts?: ClientOptions)
}
