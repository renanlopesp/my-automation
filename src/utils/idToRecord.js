import { RecordId } from 'surrealdb'

export function idToRecord(prefix, id) {
  return new RecordId(prefix, id?.toString()?.split(':')?.pop())
}
