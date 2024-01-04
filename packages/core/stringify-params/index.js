export function stringifyParams(params) {
  if (!params) return ''

  let parts = Object.keys(params)
    .sort()
    .filter(k => params[k] !== undefined)
    .map(k => {
      let v = JSON.stringify(params[k])
      return `${JSON.stringify(k)}:${v}`
    })

  return `{${parts.join(',')}}`
}
