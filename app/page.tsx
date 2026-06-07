import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-wrap">
      <section className="hero">
        <div>
          <div className="eyebrow">Bill Pro Final</div>
          <h1>ระบบจัดการบิลแบบเต็ม</h1>
          <p>รวม UI + split logic + Supabase history + snapshot data ในระบบเดียว</p>
        </div>
        <div className="actions-row">
          <Link className="btn primary" href="/bill/create">สร้างบิลใหม่</Link>
          <Link className="btn secondary" href="/history">ดูประวัติย้อนหลัง</Link>
        </div>
      </section>

      <section className="home-grid">
        <div className="hero home-card">
          <div>
            <h3>Bill Editor</h3>
            <p>เพิ่มคน เพิ่มรายการ กำหนด split mode และ save เข้า Supabase ได้ทันที</p>
          </div>
        </div>
        <div className="hero home-card">
          <div>
            <h3>History</h3>
            <p>ดูรายการบิลย้อนหลัง และเปิด detail ของแต่ละวันได้</p>
          </div>
        </div>
        <div className="hero home-card">
          <div>
            <h3>Snapshot + Normalized ตัวอย่าง </h3>
            <p>เก็บทั้ง JSON snapshot และ tables แยก people/items/participants เพื่อ query สะดวก</p>
          </div>
        </div>
      </section>
    </main>
  );
}
