import { scryptSync, timingSafeEqual } from 'node:crypto'

// Compara a senha informada no login com o hash salvo no banco.
export function verifyPassword(plainTextPassword: string, storedHash: string): boolean {
  // Formato esperado no banco: scrypt$salt$hash
  const [algorithm, salt, savedHash] = storedHash.split('$')

  // Se o formato estiver incorreto, a validação falha por segurança.
  if (algorithm !== 'scrypt' || !salt || !savedHash) {
    return false
  }

  // Recalcula o hash com a senha recebida e o mesmo salt armazenado.
  const derivedKey = scryptSync(plainTextPassword, salt, savedHash.length / 2).toString('hex')

  // comparação em tempo constante para reduzir risco de timing attack.
  return timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(savedHash, 'hex'))
}
