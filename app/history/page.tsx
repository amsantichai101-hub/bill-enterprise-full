'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBills } from '@/lib/repo';

const statusLabels: Record<string, string> = {
  draft: 'ร่าง / กำลังทำ',
  calculated: 'คิดเงินแล้ว',
  sent: 'ส่งบิลแล้ว',
  pending: 'รอเก็บเงิน',
  paid: 'เก็บเงินเรียบร้อยแล้ว',
};

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getBills().then(({ data, error }) => {
      if (error) setError(error.message);
      setItems(data || []);
    });
  }, []);

  return (
    <main className="page-shell bill-ui">
      <div className="page-wrap">
        <section className="hero card">
          <div className="hero-content">
            <div className="eyebrow">History</div>
            <h1>ประวัติรายการย้อนหลัง</h1>
            <p>
              แสดงรายการข้อมูลที่บันทึกไว้
              และสามารถเลือกดูรายละเอียดของแต่ละรายการได้
            </p>
          </div>

          <div className="actions-row">
            <Link className="btn secondary" href="/bill/create">
              <span>สร้างรายการใหม่</span>
            </Link>
          </div>
        </section>

        {error ? <p className="message">{error}</p> : null}

        <section className="list">
          {items.length === 0 && (
            <div className="empty-state card">
              <h4>ยังไม่มีรายการ</h4>
              <p>เริ่มต้นสร้างรายการเพื่อใช้งานระบบ</p>
              <Link className="btn primary" href="/bill/create">
                <span>สร้างรายการแรก</span>
              </Link>
            </div>
          )}

          {items.map((item) => {
            // อ่านค่าจากคอลัมน์ใหม่ที่เราพึ่งสร้าง หรือ Fallback จาก JSON Data
            const status = item.status || item.data?.status || 'draft';
            const owner = item.owner_name || item.data?.ownerName || '-';

            return (
              <div className="list-card card" key={item.id}>
                <div className="list-info">
                  <h4>{item.name || 'ไม่ระบุชื่อรายการ'}</h4>
                  <p className="muted">วันที่รายการ: {item.event_date || '-'}</p>
                  <p className="muted">
                    เจ้าของบิล: {owner} • สถานะ: <strong>{statusLabels[status] || status}</strong>
                  </p>
                  <p className="muted">
                    บันทึกเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                  </p>
                </div>

                <Link className="btn primary" href={`/bill/${item.id}`}>
                  <span>ดูรายละเอียด</span>
                </Link>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}