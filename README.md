# Bill Pro Final Full System

ระบบแชร์บิลแบบ Next.js + Supabase (white theme)

## Features
- สร้างบิล / แก้ไขบิล / ดูประวัติย้อนหลัง
- จัดการรายชื่อคน, รายการอาหาร/เครื่องดื่ม, discount, service, tax, shared pool
- รองรับ split mode: all / selected / owner / weighted-tier / none
- บันทึกทั้ง snapshot (`bills.data`) และ normalized tables
- หน้า History และ Detail ดูย้อนหลังได้

## Run
```bash
npm install
npm run dev
```

## Setup DB
1. Run `schema_full.sql`
2. Run `sample_bill_mayhem.sql`
3. Copy `.env.local.example` -> `.env.local` แล้วใส่ค่า Supabase
