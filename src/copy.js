const visited = []

const copy = (o, recursion = false) => {
  if (!recursion) {
    visited.length = 0
  }

  const history = visited.find(e => e[0] === o)

  if (history) {
    return history[1]
  }

  if (o instanceof Array) {
    const result = []
    visited.push([o, result])

    o.forEach(e => result.push(copy(e, true)))

    return result
  }

  if (o && typeof o === 'object') {
    let result = {}

    try {
      result = JSON.parse(JSON.stringify(o))
      visited.push([o, result])
    } catch (e) {
      visited.push([o, result])

      Object.entries(o).forEach(([k, v]) => {
        result[k] = copy(v, true)
      })
    }

    result.__proto__ = o.__proto__
    return result
  }

  visited.push([o, o])
  return o
}

module.exports = copy
