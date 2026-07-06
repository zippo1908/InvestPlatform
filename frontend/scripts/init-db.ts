import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const root = process.cwd()
const schemaPath = path.join(root, 'db', 'schema.sql')
const seedPath = path.join(root, 'db', 'seed.sql')

const host = process.env.DB_HOST
const port = Number(process.env.DB_PORT ?? '3306')
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD

if (!host || !user || password === undefined) {
  throw new Error('Missing DB_HOST, DB_USER, or DB_PASSWORD environment variable.')
}

async function run() {
  const [schemaRaw, seedRaw] = await Promise.all([fs.readFile(schemaPath, 'utf8'), fs.readFile(seedPath, 'utf8')])
  const schema = schemaRaw.replace(/^\uFEFF/, '')
  const seed = seedRaw.replace(/^\uFEFF/, '')
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  try {
    await connection.query(schema)
    await connection.query(seed)

    const [tables] = await connection.query(
      "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'capitalos' AND table_name LIKE 'cap_%'",
    )
    const [nav] = await connection.query('SELECT COUNT(*) AS screen_count FROM capitalos.cap_navigation_items')
    const [users] = await connection.query('SELECT COUNT(*) AS user_count FROM capitalos.cap_users')

    console.log(JSON.stringify({ ok: true, tables, nav, users }, null, 2))
  } finally {
    await connection.end()
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
