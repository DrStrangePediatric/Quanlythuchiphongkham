'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'nhaplieu' | 'tongket'>('nhaplieu');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Auth state
  const [authStatus, setAuthStatus] = useState<'none' | 'staff' | 'admin'>('none');
  const [passwordInput, setPasswordInput] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
  
  const getTodayStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [summaryShift, setSummaryShift] = useState('Tất cả');
  const [salary, setSalary] = useState('');

  // Biểu đồ state
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartDays, setChartDays] = useState('7');

  const quickAmounts = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập đã lưu
    const savedAuth = sessionStorage.getItem('authStatus') as 'staff' | 'admin' | null;
    if (savedAuth) {
      setAuthStatus(savedAuth);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = async (e: React.FormEvent, loginType: 'app' | 'admin') => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput, type: loginType })
      });
      const data = await res.json();
      
      if (data.success) {
        setAuthStatus(data.role);
        sessionStorage.setItem('authStatus', data.role);
        setPasswordInput('');
        if (loginType === 'admin') {
          setActiveTab('tongket');
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Mật khẩu sai' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authStatus');
    setAuthStatus('none');
    setSummaryData(null);
    setChartData([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const actualStaff = selectedStaff === 'Khác' ? customStaff : selectedStaff;

    const formData = new FormData(e.currentTarget);
    const data = {
      stt: formData.get('stt') || '',
      type: type,
      shift: shift,
      paymentMethod: isTransfer ? 'Chuyển khoản' : 'Tiền mặt',
      amount: formData.get('amount'), 
      description: formData.get('description'),
      staff: actualStaff,
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

  const fetchChart = async () => {
    try {
      const res = await fetch(`/api/chart?days=${chartDays}`);
      const data = await res.json();
      if (res.ok) {
        setChartData(data);
      }
    } catch (error) {
      console.error('Lỗi lấy dữ liệu biểu đồ');
    }
  };

  // Tự động load biểu đồ khi vào tab admin hoặc thay đổi số ngày
  useEffect(() => {
    if (authStatus === 'admin' && activeTab === 'tongket') {
      fetchChart();
    }
  }, [authStatus, activeTab, chartDays]);

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

  if (isCheckingAuth) return null;

  // Màn hình Đăng nhập App
  if (authStatus === 'none') {
    return (
      <div className="container login-container">
        <div className="lock-icon">🔒</div>
        <div className="header">
          <h1>Đăng Nhập</h1>
          <p>Vui lòng nhập mật khẩu để vào phần mềm</p>
        </div>
        <form className="login-form" onSubmit={(e) => handleLogin(e, 'app')}>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Mật khẩu App..." 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
          />
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Đang kiểm tra...' : 'Vào ứng dụng'}
          </button>
        </form>
        {message && <div className={`message ${message.type}`} style={{width: '100%'}}>{message.text}</div>}
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: activeTab === 'tongket' ? '600px' : '500px' }}>
      <div className="header" style={{ position: 'relative' }}>
        <h1>Quản Lý Thu Chi</h1>
        <p>Phòng Khám Nhi</p>
        <button 
          onClick={handleLogout}
          style={{ position: 'absolute', right: 0, top: 0, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
        >
          Đăng xuất
        </button>
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
          {/* Giao diện Nhập liệu giữ nguyên */}
          <div className="form-group">
            <label>Loại giao dịch</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" value="Thu" checked={type === 'Thu'} onChange={() => setType('Thu')} /> Thu
              </label>
              <label className="radio-label">
                <input type="radio" value="Chi" checked={type === 'Chi'} onChange={() => setType('Chi')} /> Chi
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
        // Tab Tổng Kết & Báo cáo
        <div>
          {authStatus !== 'admin' ? (
            // Form yêu cầu mật khẩu Admin
            <div className="login-container" style={{ minHeight: '30vh' }}>
              <div className="lock-icon" style={{ fontSize: '32px' }}>🔐</div>
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Khu vực Quản lý. Vui lòng nhập mật khẩu Admin để xem Báo cáo và Biểu đồ.
              </p>
              <form className="login-form" onSubmit={(e) => handleLogin(e, 'admin')}>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Mật khẩu Admin..." 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Đang mở khóa...' : 'Mở khóa báo cáo'}
                </button>
              </form>
            </div>
          ) : (
            // Đã mở khóa Admin -> Hiển thị Báo cáo và Biểu đồ
            <>
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

              {/* BIỂU ĐỒ DOANH THU */}
              <div className="chart-container">
                <div className="chart-header">
                  <span className="chart-title">📊 Biểu đồ Doanh Thu</span>
                  <select 
                    className="form-control" 
                    style={{ width: '130px', padding: '6px', fontSize: '13px' }}
                    value={chartDays}
                    onChange={(e) => setChartDays(e.target.value)}
                  >
                    <option value="7">7 ngày qua</option>
                    <option value="14">14 ngày qua</option>
                    <option value="30">30 ngày qua</option>
                  </select>
                </div>
                
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickMargin={10} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} width={50} tickFormatter={(value) => `${value/1000}k`} />
                      <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="thu" name="Tổng Thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="chi" name="Tổng Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Đang tải dữ liệu biểu đồ...
                  </div>
                )}
              </div>
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
