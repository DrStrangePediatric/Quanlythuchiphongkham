import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const getAuth = () => {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
};

// Hàm so sánh ngày DD/MM/YYYY
const parseDateString = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // parts[0]: DD, parts[1]: MM, parts[2]: YYYY
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
  }
  return 0;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // DD/MM/YYYY
    const endDate = searchParams.get('endDate'); // DD/MM/YYYY
    const shiftFilter = searchParams.get('shift') || 'Tất cả';

    const startTimestamp = startDate ? parseDateString(startDate) : 0;
    const endTimestamp = endDate ? parseDateString(endDate) : Number.MAX_SAFE_INTEGER;

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Chưa cấu hình Google Sheet' }, { status: 500 });
    }

    let sheetName = 'Trang tính 1';
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      sheetName = meta.data.sheets?.[0]?.properties?.title || 'Trang tính 1';
    } catch (metaErr: any) {
      if (metaErr.message?.includes('permission') || metaErr.code === 403) {
        return NextResponse.json({ error: 'Lỗi: Bot chưa được share quyền truy cập Google Sheet!' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Lỗi không tìm thấy file Google Sheet' }, { status: 404 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:G`, // Đọc đến cột G (Số tiền ở format mới)
    });

    const rows = response.data.values || [];

    let thuTM = 0;
    let thuCK = 0;
    let chiTM = 0;
    let chiCK = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowDateStr = row[1]; // B (1) = Ngày
      const rowTimestamp = parseDateString(rowDateStr);

      // Nếu có lọc ngày, kiểm tra xem giao dịch có nằm trong khoảng ngày không
      if (startTimestamp > 0 && rowTimestamp < startTimestamp) continue;
      if (endTimestamp < Number.MAX_SAFE_INTEGER && rowTimestamp > endTimestamp) continue;

      let rowShift = '';
      let type = '';
      let paymentMethod = 'Tiền mặt'; // Mặc định cũ
      let amountStr = '0';

      // Xử lý tương thích ngược (Cũ vs Mới)
      if (row[3] === 'Thu' || row[3] === 'Chi') {
        // Định dạng cũ: STT | Ngày | Giờ | Loại | Số tiền
        type = row[3];
        amountStr = row[4];
      } else if (row[4] === 'Thu' || row[4] === 'Chi') {
        // Định dạng mới: STT | Ngày | Giờ | Ca | Loại | Hình thức | Số tiền
        rowShift = row[3];
        type = row[4];
        paymentMethod = row[5];
        amountStr = row[6];
      } else {
        continue; // Dòng không hợp lệ
      }

      // Lọc theo ca
      if (shiftFilter !== 'Tất cả' && rowShift && rowShift !== shiftFilter) {
        continue;
      }

      const amount = parseInt(amountStr?.replace(/[,.]/g, '') || '0');
      
      if (type === 'Thu') {
        if (paymentMethod === 'Chuyển khoản') thuCK += amount;
        else thuTM += amount;
      } else if (type === 'Chi') {
        if (paymentMethod === 'Chuyển khoản') chiCK += amount;
        else chiTM += amount;
      }
    }

    return NextResponse.json({ thuTM, thuCK, chiTM, chiCK });
  } catch (error) {
    console.error('Summary GET Error:', error);
    return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu từ Sheet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startDate, endDate, shift, thuTM, thuCK, chiTM, chiCK, salary, remaining } = body;

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const now = new Date();
    const dateString = new Intl.DateTimeFormat('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(now);
    
    const timeString = new Intl.DateTimeFormat('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Chỉ lưu Google Sheet TỔNG KẾT nếu là báo cáo cuối ngày của nguyên ngày
    if (spreadsheetId && startDate === endDate && shift === 'Tất cả') {
      try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetName = meta.data.sheets?.[0]?.properties?.title || 'Trang tính 1';

        const totalThu = thuTM + thuCK;
        const totalChi = chiTM + chiCK;
        const remainingTM = thuTM - chiTM - salary;
        const remainingCK = thuCK - chiCK;

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${sheetName}'!A:I`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              ['', dateString, timeString, '', 'TỔNG KẾT', '', `Thu: ${totalThu} | Chi: ${totalChi} | Lương: ${salary} | DƯ: ${remaining} (TM: ${remainingTM}, CK: ${remainingCK})`, 'HỆ THỐNG', ''],
            ],
          },
        });
      } catch (sheetError) {
        console.error('Sheet append error on summary:', sheetError);
      }
    }

    // 2. Gửi Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      let reportTitle = `TỔNG KẾT NGÀY ${startDate}`;
      if (startDate !== endDate) {
        reportTitle = `TỔNG KẾT (${startDate} - ${endDate})`;
      } else if (shift !== 'Tất cả') {
        reportTitle = `TỔNG KẾT CA ${shift.toUpperCase()} (${startDate})`;
      }

      const totalThu = thuTM + thuCK;
      const totalChi = chiTM + chiCK;
      const remainingTM = thuTM - chiTM - salary;
      const remainingCK = thuCK - chiCK;

      const message = `
📊 *${reportTitle}*
--------------------------
📈 *TỔNG THU: ${totalThu.toLocaleString('vi-VN')}*
   💵 Tiền mặt: ${thuTM.toLocaleString('vi-VN')}
   💳 Chuyển khoản: ${thuCK.toLocaleString('vi-VN')}

📉 *TỔNG CHI: ${totalChi.toLocaleString('vi-VN')}*
   💵 Tiền mặt: ${chiTM.toLocaleString('vi-VN')}
   💳 Chuyển khoản: ${chiCK.toLocaleString('vi-VN')}

💸 Lương NV: *${salary.toLocaleString('vi-VN')}* (Trừ vào TM)
--------------------------
💰 *DƯ TRONG KÉT: ${remaining.toLocaleString('vi-VN')}*
_(💵 Tiền mặt: ${remainingTM.toLocaleString('vi-VN')})_
_(💳 Chuyển khoản: ${remainingCK.toLocaleString('vi-VN')})_
      `;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
      } catch (telegramError) {
        console.error('Telegram Error:', telegramError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Summary POST Error:', error);
    return NextResponse.json({ error: 'Lỗi khi xử lý chốt sổ' }, { status: 500 });
  }
}
