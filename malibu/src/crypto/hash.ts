import sha256 from 'fast-sha256'

export function hash(str: string) {
  const encoder = new TextEncoder()
  const hash = sha256(encoder.encode(str))
  const hashHex = Buffer.from(hash).toString('hex')

  return hashHex
}
