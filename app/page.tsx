import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell bill-ui">
      <div className="page-wrap">
        <section className="hero card">
          <div className="hero-content">
            <div className="eyebrow">Bill Management System</div>
            <h1>ระบบจัดการรายการค่าใช้จ่าย</h1>
            <p>
              จัดการรายการค่าใช้จ่าย แบ่งค่าใช้จ่ายอัตโนมัติ
              พร้อมบันทึกและเรียกดูข้อมูลย้อนหลังได้ในระบบเดียว
            </p>
          </div>

          <div className="actions-row">
            <Link className="btn primary" href="/bill/create">
              <span>สร้างรายการใหม่</span>
            </Link>

            <Link className="btn secondary" href="/history">
              <span>ดูประวัติย้อนหลัง</span>
            </Link>
          </div>
        </section>

        <section className="home-grid">
          <div className="home-card card">
            <div className="home-card-inner">
              <h3>จัดการรายการ</h3>
              <p>
                เพิ่มผู้ใช้งาน รายการค่าใช้จ่าย และกำหนดรูปแบบการแบ่งค่าใช้จ่ายได้อย่างชัดเจน
              </p>
            </div>
          </div>

          <div className="home-card card">
            <div className="home-card-inner">
              <h3>บันทึกข้อมูล</h3>
              <p>
                บันทึกข้อมูลอย่างเป็นระบบ พร้อมจัดเก็บประวัติสำหรับการตรวจสอบย้อนหลัง
              </p>
            </div>
          </div>

          <div className="home-card card">
            <div className="home-card-inner">
              <h3>ตรวจสอบย้อนหลัง</h3>
              <p>
                เรียกดูรายละเอียดของแต่ละรายการได้ครบถ้วน เพื่อช่วยให้ตรวจสอบข้อมูลได้สะดวก
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
