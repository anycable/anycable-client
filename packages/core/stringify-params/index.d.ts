type Params = { [token: string]: boolean | number | string | null | undefined }

export function stringifyParams(params: Params | void | null): string
