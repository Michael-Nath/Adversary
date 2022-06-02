import * as ed from '@noble/ed25519'

export type PublicKey = string
export type Signature = string

function hex2uint8(hex: string) {
  return Uint8Array.from(Buffer.from(hex, 'hex'))
}

export async function ver(sig: Signature, message: string, pubkey: PublicKey) {
  const pubkeyBuffer = hex2uint8(pubkey)
  const sigBuffer = hex2uint8(sig)
  const messageBuffer = Uint8Array.from(Buffer.from(message, 'utf-8'))

  return await ed.verify(sigBuffer, messageBuffer, pubkeyBuffer)
}
