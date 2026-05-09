'use client';

import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'nhaplieu' | 'tongket'>('nhaplieu');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Nhập liệu state
  const [type, setType] = useState('Thu');
  const [amount, setAmount] = useState('');
  
  // Tổng kết state
  const [summaryData, setSummaryData] = useState<{thu: number, chi: number} | null>(null);
  const [salary, setSalary] = useState('');

  const quickAmounts = [70, 80, 90, 100, 110, 120, 130, 140, 150];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      stt: formData.get('stt') || '',
      type: type,
      amount: formData.get('amount'), // Ví dụ: "70"
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
        setAmount('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra, vui lòng thử lại.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/summary');
      const data = await res.json();
      if (res.ok) {
        setSummaryData({ thu: data.thu, chi: data.chi });
        setMessage({ type: 'success', text: 'Đã lấy số liệu hôm nay thành công.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi lấy số liệu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể kết nối máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEndDay = async () => {
    if (!summaryData) return;
    
    setLoading(true);
    setMessage(null);
    
    const salaryNum = parseInt(salary) || 0;
    // Tổng còn lại = Tổng Thu - Tổng Chi - Lương
    const remaining = summaryData.thu - summaryData.chi - (salaryNum * 1000);

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thu: summaryData.thu,
          chi: summaryData.chi,
          salary: salaryNum * 1000,
          remaining: remaining
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Đã chốt sổ và gửi báo cáo qua Telegram!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi chốt sổ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể kết nối máy chủ.' });
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

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'nhaplieu' ? 'active' : ''}`}
          onClick={() => {setActiveTab('nhaplieu'); setMessage(null)}}
        >
          Nhập liệu
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tongket' ? 'active' : ''}`}
          onClick={() => {setActiveTab('tongket'); setMessage(null)}}
        >
          Tổng kết ngày
        </button>
      </div>

      {activeTab === 'nhaplieu' ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Loại giao dịch</label>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="type" 
                  value="Thu" 
                  checked={type === 'Thu'}
                  onChange={() => setType('Thu')} 
                /> Thu
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="type" 
                  value="Chi" 
                  checked={type === 'Chi'}
                  onChange={() => setType('Chi')}
                /> Chi
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="stt">Số thứ tự (Phiếu khám)</label>
            <input
              type="text"
              id="stt"
              name="stt"
              className="form-control"
              placeholder="VD: 01, 02... (nếu có)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Số tiền (Nghìn VNĐ)</label>
            
            {type === 'Thu' && (
              <div className="quick-buttons">
                {quickAmounts.map(val => (
                  <button 
                    key={val} 
                    type="button" 
                    className="quick-btn"
                    onClick={() => setAmount(val.toString())}
                  >
                    {val}k
                  </button>
                ))}
              </div>
            )}
            
            <input
              type="number"
              id="amount"
              name="amount"
              className="form-control"
              placeholder="VD: 70 (tương đương 70.000đ)"
              required
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Lý do / Nội dung</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              placeholder="Khám bệnh cho bé..."
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
      ) : (
        <div>
          <button 
            className="btn-submit btn-fetch" 
            onClick={fetchSummary}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Lấy số liệu hôm nay'}
          </button>

          {summaryData && (
            <>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Tổng Thu:</span>
                  <span className="text-success">{(summaryData.thu).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="summary-row">
                  <span>Tổng Chi:</span>
                  <span className="text-danger">{(summaryData.chi).toLocaleString('vi-VN')} đ</span>
                </div>
                
                <div className="form-group" style={{marginTop: '16px'}}>
                  <label>Nhập Lương nhân viên (Nghìn VNĐ)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="VD: 200 (tương đương 200.000đ)"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>

                <div className="summary-row total">
                  <span>TỔNG CÒN LẠI:</span>
                  <span>
                    {(summaryData.thu - summaryData.chi - ((parseInt(salary)||0) * 1000)).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <button 
                className="btn-submit btn-danger" 
                onClick={handleEndDay}
                disabled={loading}
              >
                {loading ? 'Đang gửi...' : 'Chốt sổ & Gửi Telegram'}
              </button>
            </>
          )}
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
