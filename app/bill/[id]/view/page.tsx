'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import BillEditor from '@/components/BillEditor';
import { getBillDetail } from '@/lib/repo';
import { BillState } from '@/lib/types';

export default function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [billId, setBillId] = useState('');
  const [data, setData] = useState<BillState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resolved = await params;
        setBillId(resolved.id);

        const result = await getBillDetail(resolved.id);

        if (result.error) {
          setError(result.error.message || 'ไม่สามารถโหลดข้อมูลบิลได้');
          setData(null);
        } else {
          setData(result.data);
        }
      } catch (e: any) {
        setError(e?.message || 'unexpected error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params]);

  if (loading) {
    return (
      <main className="page-wrap">
        <section className="hero card">
          <div>
            <div className="eyebrow">Bill Detail</div>
            <h1>กำลังโหลดข้อมูลบิล...</h1>
            <p>กรุณารอสักครู่</p>
          </div>
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page-wrap">
        <section className="hero card">
          <div>
            <div className="eyebrow">Bill Detail</div>
            <h1>ไม่พบบิล</h1>
            <p>{error || 'ไม่สามารถโหลดข้อมูลได้'}</p>
          </div>

          <div className="actions-row">
            <Link className="btn secondary" href="/history">
              ย้อนกลับ
            </Link>
            <Link className="btn primary" href="/bill/create">
              สร้างบิลใหม่
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-wrap max-w-4xl mx-auto p-4 space-y-6">
      {/* ป้ายเตือนสถานะมุมมอง */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm mb-4 mt-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-800 font-medium">
              โหมดดูอย่างเดียว (Read-only) - คุณสามารถดูรายละเอียดและสแกน QR Code เพื่อจ่ายเงินได้
            </p>
          </div>
        </div>
      </div>

      <BillEditor initialState={{ ...data, id: billId }} mode="edit" isReadOnly={true} />
    </main>
  );
}