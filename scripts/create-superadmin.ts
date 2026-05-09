/**
 * Script para criar o superadmin inicial.
 * Uso: npm run seed:superadmin
 * Defina as variáveis abaixo antes de rodar.
 */
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const EMAIL = process.env.SUPERADMIN_EMAIL ?? 'admin@agendamentos.com'
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'trocar-esta-senha-123'
const NAME = process.env.SUPERADMIN_NAME ?? 'Super Admin'

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } })
  if (existing) {
    console.log(`Superadmin já existe: ${EMAIL}`)
    return
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12)
  const user = await prisma.user.create({
    data: { name: NAME, email: EMAIL, passwordHash, role: 'superadmin', companyId: null },
  })

  console.log(`✅ Superadmin criado:`)
  console.log(`   ID:    ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Senha: ${PASSWORD}`)
  console.log(`\n⚠️  Altere a senha após o primeiro login!`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
