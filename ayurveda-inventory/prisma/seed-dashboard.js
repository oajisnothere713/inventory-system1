require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set — set it in your environment to run this seed.')
    process.exit(1)
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    console.log('Seeding dashboard-focused dummy data via raw SQL...')
    const now = new Date()

    // department
    let res = await client.query('SELECT dept_id FROM departments WHERE dept_code = $1', ['PHARM'])
    let deptId
    if (res.rows.length) deptId = res.rows[0].dept_id
    else {
      res = await client.query('INSERT INTO departments (dept_code, dept_name, updated_at) VALUES ($1,$2,$3) RETURNING dept_id', ['PHARM', 'Pharmacy', now])
      deptId = res.rows[0].dept_id
    }

    // supplier
    res = await client.query('SELECT supplier_id FROM suppliers WHERE supplier_code = $1', ['SUPP1'])
    let supplierId
    if (res.rows.length) supplierId = res.rows[0].supplier_id
    else {
      res = await client.query('INSERT INTO suppliers (supplier_code, supplier_name, updated_at) VALUES ($1,$2,$3) RETURNING supplier_id', ['SUPP1', 'Seed Supplier 1', now])
      supplierId = res.rows[0].supplier_id
    }

    // user
    res = await client.query('SELECT user_id FROM users WHERE username = $1', ['seed_admin'])
    let userId
    if (res.rows.length) userId = res.rows[0].user_id
    else {
      res = await client.query(
        'INSERT INTO users (employee_id, full_name, username, password_hash, role, dept_id, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id',
        ['EMP-SEED-1', 'Seed Admin', 'seed_admin', 'seed', 'admin', deptId, now]
      )
      userId = res.rows[0].user_id
    }

    // items
    const itemsData = [
      { itemCode: 'ITEM-C-001', itemName: 'X-Ray Machine', category: 'CAPEX', subCategory: 'devices', unit: 'nos', minStock: '0', hasAmc: true },
      { itemCode: 'ITEM-O-001', itemName: 'Herbal Powder', category: 'OPEX', subCategory: 'medicines', unit: 'kg', minStock: '10' },
      { itemCode: 'ITEM-O-002', itemName: 'Disposable Syringe', category: 'OPEX', subCategory: 'consumables', unit: 'pcs', minStock: '50' },
    ]

    const createdItems = []
    for (const it of itemsData) {
      res = await client.query('SELECT item_id FROM items WHERE item_code = $1', [it.itemCode])
      let itemId
      if (res.rows.length) itemId = res.rows[0].item_id
      else {
        res = await client.query(
          `INSERT INTO items (item_code, item_name, category, sub_category, unit, primary_dept_id, default_supplier_id, min_stock_level, has_amc, created_by, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING item_id`,
          [it.itemCode, it.itemName, it.category, it.subCategory, it.unit, deptId, supplierId, it.minStock, it.hasAmc ? true : false, userId, now]
        )
        itemId = res.rows[0].item_id
      }
      createdItems.push({ ...it, itemId })
    }

    // add an AMC due in ~45 days for the CAPEX item
    const capex = createdItems.find((x) => x.category === 'CAPEX')
    if (capex) {
      res = await client.query('SELECT amc_id FROM amc_contracts WHERE amc_number = $1', ['AMC-SEED-1'])
      if (!res.rows.length) {
        const start = new Date()
        const end = new Date()
        end.setDate(end.getDate() + 45)
        await client.query(
          `INSERT INTO amc_contracts (amc_number, item_id, supplier_id, contract_start, contract_end, created_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          ['AMC-SEED-1', capex.itemId, supplierId, start, end, userId]
        )
      }
    }

    // alerts
    const low = createdItems.find((x) => x.itemCode === 'ITEM-O-001')
    if (low) {
      await client.query(
        `INSERT INTO alerts (alert_type, item_id, alert_title, alert_message, severity, status, is_visible)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        ['low_stock', low.itemId, 'Low stock - Herbal Powder', 'Total stock below minimum threshold', 'high', 'active', true]
      )
    }

    const other = createdItems[2]
    if (other) {
      await client.query(
        `INSERT INTO alerts (alert_type, item_id, alert_title, alert_message, severity, status, is_visible)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        ['anomaly', other.itemId, 'Consumption anomaly', 'Usage higher than expected', 'medium', 'active', true]
      )
    }

    console.log('Dashboard seed complete.')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
