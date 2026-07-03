// Fun, memorable default usernames — "CosmicPanda", "NinjaMango", "MysticGojo".
// Words are kept short so adjective+noun (+ an optional 2-digit suffix) always
// fits inside the 15-char username limit.

const ADJECTIVES = [
  'Cosmic', 'Ninja', 'Mighty', 'Silent', 'Rapid', 'Solar', 'Lunar', 'Turbo',
  'Hyper', 'Mystic', 'Shadow', 'Golden', 'Frost', 'Blaze', 'Storm', 'Swift',
  'Wild', 'Brave', 'Epic', 'Neon', 'Pixel', 'Cyber', 'Iron', 'Jade', 'Royal',
]

const NOUNS = [
  // animals
  'Panda', 'Tiger', 'Falcon', 'Otter', 'Fox', 'Wolf', 'Koala', 'Lynx', 'Orca',
  'Hawk', 'Yeti', 'Bison', 'Raven', 'Gecko',
  // fruits
  'Mango', 'Peach', 'Kiwi', 'Lychee', 'Papaya', 'Guava', 'Plum', 'Berry', 'Fig',
  // vegetables
  'Pepper', 'Radish', 'Turnip', 'Carrot', 'Kale', 'Yam', 'Beet', 'Chili',
  // anime
  'Naruto', 'Goku', 'Luffy', 'Zoro', 'Levi', 'Sasuke', 'Gojo', 'Tanjiro',
  'Eren', 'Mikasa', 'Vegeta', 'Deku', 'Itachi', 'Saitama',
]

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** A single random cool name, e.g. "MysticFalcon" (always ≤ 15 chars). */
export function generateUsername(): string {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}`.slice(0, 15)
}

/**
 * Generate a cool username that passes a caller-supplied availability check.
 * The check should return true when the name is already used OR reserved.
 */
export async function generateUniqueUsername(
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    // After a few clean tries, start appending a small number to widen the pool.
    const base = generateUsername()
    const candidate =
      attempt < 5 ? base : `${base}${Math.floor(Math.random() * 100)}`.slice(0, 15)
    if (!(await isTaken(candidate))) return candidate
  }
  // Extremely unlikely fallback — guaranteed unique-ish and schema-valid.
  return `User${Date.now().toString().slice(-8)}`
}
