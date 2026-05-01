#!/usr/bin/env node
/**
 * Detects the machine's LAN IP and writes NEXT_PUBLIC_QZ_TRAY_LAN_IP into apps/web/.env.local.
 * Run once after connecting to the restaurant WiFi, then restart the dev server.
 *
 *   node scripts/setup-qz-lan-ip.mjs
 */

import { networkInterfaces } from 'os'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../apps/web/.env.local')

function getLocalIP() {
  const nets = networkInterfaces()
  const candidates = []

  for (const [name, ifaces] of Object.entries(nets)) {
    for (const iface of ifaces ?? []) {
      if (iface.family !== 'IPv4' || iface.internal) continue
      // Prefer Wi-Fi adapters; skip VPN/virtual adapters
      const isVirtual = /vmware|virtualbox|veth|docker|loopback/i.test(name)
      if (!isVirtual) candidates.push({ ip: iface.address, name })
    }
  }

  if (candidates.length === 0) return null

  // Prefer 192.168.x.x (typical home/restaurant router), then 10.x.x.x
  const preferred =
    candidates.find((c) => c.ip.startsWith('192.168.')) ??
    candidates.find((c) => c.ip.startsWith('10.')) ??
    candidates[0]

  return preferred
}

function upsertEnvVar(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${value}`
  return pattern.test(content) ? content.replace(pattern, line) : `${content}\n${line}\n`
}

const candidate = getLocalIP()

if (!candidate) {
  console.error('Nenhum IP de rede local encontrado. Verifique se o Wi-Fi esta ativo.')
  process.exit(1)
}

const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const updated = upsertEnvVar(current.trimEnd(), 'NEXT_PUBLIC_QZ_TRAY_LAN_IP', candidate.ip)

writeFileSync(envPath, updated + '\n', 'utf8')

console.log(`IP detectado: ${candidate.ip}  (adaptador: ${candidate.name})`)
console.log(`Salvo em .env.local: NEXT_PUBLIC_QZ_TRAY_LAN_IP=${candidate.ip}`)
console.log('')
console.log('Proximos passos:')
console.log('  1. Reinicie o servidor: npm run dev')
console.log(`  2. No celular, abra https://${candidate.ip}:8181 e aceite o certificado`)
console.log('  3. Escaneie o QR no PDV -> Comanda termica -> editar -> "Configurar celular via QR"')
