import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const getAuth = () => {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
};

const parseDateString = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
  }
  return 0;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

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
    } catch (err) {
      return NextResponse.json({ error: 'Không tìm thấy Sheet' }, { status: 404 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:G`,
    });

    const rows = response.data.values || [];
    
    // Tính toán mốc thời gian (bắt đầu từ 00:00 của ngày N trước)
    const now = new Date();
    // Chỉnh múi giờ Việt Nam
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const cutoffDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffTimestamp = cutoffDate.getTime();

    // Map chứa tổng theo ngày: { "10/05": { thu: 1000, chi: 200 } }
    const dailyData: Record<string, { name: string; thu: number; chi: number }> = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowDateStr = row[1]; // B = Ngày (DD/MM/YYYY)
      const rowTimestamp = parseDateString(rowDateStr);

      if (rowTimestamp < cutoffTimestamp) continue;

      // Cắt bỏ phần năm để biểu đồ ngắn gọn, ví dụ "10/05"
      const shortDate = rowDateStr.split('/').slice(0, 2).join('/');
      
      if (!dailyData[shortDate]) {
        dailyData[shortDate] = { name: shortDate, thu: 0, chi: 0 };
      }

      let type = '';
      let amountStr = '0';

      if (row[3] === 'Thu' || row[3] === 'Chi') {
        type = row[3];
        amountStr = row[4];
      } else if (row[4] === 'Thu' || row[4] === 'Chi') {
        type = row[4];
        amountStr = row[6];
      } else {
        continue;
      }

      const amount = parseInt(amountStr?.replace(/[,.]/g, '') || '0');
      
      if (type === 'Thu') dailyData[shortDate].thu += amount;
      else if (type === 'Chi') dailyData[shortDate].chi += amount;
    }

    // Convert sang mảng và sắp xếp tăng dần theo ngày
    // Mẹo: Vì chúng ta đã lọc trong N ngày qua nên việc parse lại ngày để sort cũng không quá khó
    const chartData = Object.values(dailyData).sort((a, b) => {
      const partsA = a.name.split('/');
      const partsB = b.name.split('/');
      const valA = parseInt(partsA[1]) * 100 + parseInt(partsA[0]);
      const valB = parseInt(partsB[1]) * 100 + parseInt(partsB[0]);
      return valA - valB;
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Chart GET Error:', error);
    return NextResponse.json({ error: 'Lỗi đọc dữ liệu' }, { status: 500 });
  }
}
