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

export async function GET() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Chưa cấu hình Google Sheet' }, { status: 500 });
    }

    // Đọc toàn bộ dữ liệu từ Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Trang tính 1!A:E', // Đọc cột Ngày (A) đến Cột Số Tiền (E)
    });

    const rows = response.data.values || [];
    const now = new Date();
    const todayString = now.toLocaleDateString('vi-VN');

    let totalThu = 0;
    let totalChi = 0;

    // Bỏ qua dòng tiêu đề (index 0) nếu có
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // row[0] là STT, row[1] là Ngày, row[3] là Loại, row[4] là Số Tiền
      // A (0) = STT
      // B (1) = Ngày
      // C (2) = Giờ
      // D (3) = Loại
      // E (4) = Số tiền
      
      const rowDate = row[1];
      const type = row[3];
      const amountStr = row[4];

      if (rowDate === todayString) {
        // Loại bỏ dấu phẩy/chấm nếu có trong số tiền và chuyển thành số
        const amount = parseInt(amountStr?.replace(/[,.]/g, '') || '0');
        
        if (type === 'Thu') {
          totalThu += amount;
        } else if (type === 'Chi') {
          totalChi += amount;
        }
      }
    }

    return NextResponse.json({ thu: totalThu, chi: totalChi });
  } catch (error) {
    console.error('Summary GET Error:', error);
    return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu từ Sheet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { thu, chi, salary, remaining } = body;

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const now = new Date();
    const dateString = now.toLocaleDateString('vi-VN');
    const timeString = now.toLocaleTimeString('vi-VN');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // 1. Lưu dòng TỔNG KẾT vào Google Sheet
    if (spreadsheetId) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Trang tính 1!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              ['', dateString, timeString, 'TỔNG KẾT', '', `Thu: ${thu.toLocaleString('vi-VN')} | Chi: ${chi.toLocaleString('vi-VN')} | Lương: ${salary.toLocaleString('vi-VN')} | DƯ: ${remaining.toLocaleString('vi-VN')}`, 'HỆ THỐNG'],
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
      const message = `
📊 *TỔNG KẾT NGÀY ${dateString}*
--------------------------
📈 Tổng Thu: *${thu.toLocaleString('vi-VN')} VNĐ*
📉 Tổng Chi: *${chi.toLocaleString('vi-VN')} VNĐ*
💸 Lương NV: *${salary.toLocaleString('vi-VN')} VNĐ*
--------------------------
💵 *CÒN LẠI: ${remaining.toLocaleString('vi-VN')} VNĐ*
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
