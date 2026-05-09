'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type'),
      amount: formData.get('amount'),
      description: formData.get('description'),
      staff: formData.get('staff'),
    };

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Đã lưu dữ liệu thành công!' });
        (e.target as HTMLFormElement).reset();
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra, vui lòng thử lại.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Quản Lý Thu Chi</h1>
        <p>Phòng Khám Nhi</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Loại giao dịch</label>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="type" value="Thu" defaultChecked required /> Thu
            </label>
            <label className="radio-label">
              <input type="radio" name="type" value="Chi" required /> Chi
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Số tiền (VNĐ)</label>
          <input
            type="number"
            id="amount"
            name="amount"
            className="form-control"
            placeholder="VD: 500000"
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Lý do / Nội dung</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            placeholder="Khám bệnh cho bé Nguyễn Văn A..."
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="staff">Tên nhân viên nhập liệu</label>
          <input
            type="text"
            id="staff"
            name="staff"
            className="form-control"
            placeholder="VD: Điều dưỡng B"
            required
          />
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Xác nhận lưu'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
