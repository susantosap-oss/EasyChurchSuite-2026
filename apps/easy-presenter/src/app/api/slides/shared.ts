import { join } from 'path'
import { getDataDir } from '@/lib/db.server'

/** Rendered presentation pages (PDF → JPG), stored as data/slides/<deck>/<page file> */
export function slidesDir(): string {
  return join(getDataDir(), 'slides')
}
