type Params = { [token: string]: boolean | number | string }

export function stringifyParams(params: Params | void | null): string
