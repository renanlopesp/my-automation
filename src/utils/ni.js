import { nanoid } from 'nanoid'

export function ni(size) {
  return nanoid(size, '0123456789abcdef')
}
