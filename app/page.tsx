'use client';

import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'nhaplieu' | 'tongket'>('nhaplieu');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Nhập liệu state
  const [type, setType] = useState('Thu');
  const [shift, setShift] = useState('Sáng');
  const [isTransfer, setIsTransfer] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('Dương');
  const [customStaff, setCustomStaff] = useState('');
  
  // Tổng kết state
  const [summaryData, setSummaryData] = useState<{
    thuTM: number, thuCK: number, chiTM: number, chiCK: number
  } | null>(null);
  
  // Lấy ngày hôm nay định dạng YYYY-MM-DD cho input type="date"
  const getTodayStr = () => {
    const d = new Date();
    // Chỉnh múi giờ việt nam
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [summaryShift, setSummaryShift] = useState('Tất cả');
  const [salary, setSalary] = useState('');

  const quickAmounts = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      stt: formData.get('stt') || '',
      type: type,
      shift: shift,
      paymentMethod: isTransfer ? 'Chuyển khoản' : 'Tiền mặt',
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
        setAmount('');
        setIsTransfer(false);
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
      // Chuyển format YYYY-MM-DD sang DD/MM/YYYY để gửi API
      const formatToVN = (d: string) => d ? d.split('-').reverse().join('/') : '';
      
      const query = new URLSearchParams({
        startDate: formatToVN(startDate),
        endDate: formatToVN(endDate),
        shift: summaryShift
      });

      const res = await fetch(`/api/summary?${query.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummaryData(data);
        setMessage({ type: 'success', text: 'Đã lấy số liệu thành công.' });
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
    const totalThu = summaryData.thuTM + summaryData.thuCK;
    const totalChi = summaryData.chiTM + summaryData.chiCK;
    const remaining = totalThu - totalChi - (salaryNum * 1000);

    const formatToVN = (d: string) => d.split('-').reverse().join('/');

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formatToVN(startDate),
          endDate: formatToVN(endDate),
          shift: summaryShift,
          thuTM: summaryData.thuTM,
          thuCK: summaryData.thuCK,
          chiTM: summaryData.chiTM,
          chiCK: summaryData.chiCK,
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
          Tổng kết & Báo cáo
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
            <label>Ca làm việc</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" checked={shift === 'Sáng'} onChange={() => setShift('Sáng')} /> Sáng
              </label>
              <label className="radio-label">
                <input type="radio" checked={shift === 'Trưa'} onChange={() => setShift('Trưa')} /> Trưa
              </label>
              <label className="radio-label">
                <input type="radio" checked={shift === 'Chiều'} onChange={() => setShift('Chiều')} /> Chiều
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="stt">Số thứ tự (Phiếu khám)</label>
            <input type="text" id="stt" name="stt" className="form-control" placeholder="VD: 01, 02... (nếu có)" />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Số tiền (Nghìn VNĐ)</label>
            
            {type === 'Thu' && (
              <div className="quick-buttons">
                {quickAmounts.map(val => (
                  <button key={val} type="button" className="quick-btn" onClick={() => setAmount(val.toString())}>
                    {val}k
                  </button>
                ))}
              </div>
            )}
            
            <input
              type="number" id="amount" name="amount" className="form-control"
              placeholder="VD: 70 (tương đương 70.000đ)" required min="0"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={isTransfer} onChange={(e) => setIsTransfer(e.target.checked)} />
                💳 Khách chuyển khoản ngân hàng
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Lý do / Nội dung (Không bắt buộc)</label>
            <textarea id="description" name="description" className="form-control" placeholder="Ghi chú thêm nếu cần..."></textarea>
          </div>

          <div className="form-group">
            <label>Nhân viên nhập liệu</label>
            <div className="radio-group" style={{ marginBottom: selectedStaff === 'Khác' ? '10px' : '0' }}>
              {['Dương', 'Trúc', 'Kiều', 'Trinh', 'Khác'].map((name) => (
                <label key={name} className="radio-label">
                  <input 
                    type="radio" 
                    name="staff_radio" 
                    value={name} 
                    checked={selectedStaff === name}
                    onChange={(e) => {
                      setSelectedStaff(e.target.value);
                      if (e.target.value !== 'Khác') setCustomStaff('');
                    }} 
                  /> {name}
                </label>
              ))}
            </div>
            
            {selectedStaff === 'Khác' ? (
              <input 
                type="text" 
                id="staff" 
                name="staff" 
                className="form-control" 
                placeholder="Nhập tên nhân viên khác..." 
                required 
                value={customStaff}
                onChange={(e) => setCustomStaff(e.target.value)}
              />
            ) : (
              <input type="hidden" name="staff" value={selectedStaff} />
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận lưu'}
          </button>
        </form>
      ) : (
        <div>
          <div className="grid-2">
            <div className="form-group">
              <label>Từ ngày</label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Đến ngày</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Lọc theo Ca</label>
            <select className="form-control" value={summaryShift} onChange={(e) => setSummaryShift(e.target.value)}>
              <option value="Tất cả">Tất cả các ca</option>
              <option value="Sáng">Ca Sáng</option>
              <option value="Trưa">Ca Trưa</option>
              <option value="Chiều">Ca Chiều</option>
            </select>
          </div>

          <button className="btn-submit btn-fetch" onClick={fetchSummary} disabled={loading}>
            {loading ? 'Đang tải...' : 'Lấy số liệu'}
          </button>

          {summaryData && (
            <>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Thu Tiền Mặt:</span>
                  <span className="text-success">{(summaryData.thuTM).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="summary-row">
                  <span>Thu Chuyển Khoản:</span>
                  <span className="text-success">{(summaryData.thuCK).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="summary-row" style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                  <span>Chi Tiền Mặt:</span>
                  <span className="text-danger">{(summaryData.chiTM).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="summary-row">
                  <span>Chi Chuyển Khoản:</span>
                  <span className="text-danger">{(summaryData.chiCK).toLocaleString('vi-VN')} đ</span>
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
                    {(summaryData.thuTM + summaryData.thuCK - summaryData.chiTM - summaryData.chiCK - ((parseInt(salary)||0) * 1000)).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {startDate === endDate ? (
                <button className="btn-submit btn-danger" onClick={handleEndDay} disabled={loading}>
                  {loading ? 'Đang gửi...' : `Chốt sổ & Gửi Telegram (${summaryShift === 'Tất cả' ? 'Cả ngày' : 'Ca ' + summaryShift})`}
                </button>
              ) : (
                <p style={{textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)'}}>
                  * Chức năng Gửi Telegram chỉ khả dụng khi Tổng kết trong 1 ngày duy nhất.
                </p>
              )}
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
