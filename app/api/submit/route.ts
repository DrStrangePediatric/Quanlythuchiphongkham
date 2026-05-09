import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stt, type, amount, description, staff } = body;

    if (!type || !amount || !description || !staff) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' }, { status: 400 });
    }

    // Tiền nhập vào là nghìn đồng, nhân với 1000 để ra số thật
    const realAmount = parseInt(amount) * 1000;

    // 1. Prepare Google Sheets Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Ensure private key newlines are handled correctly
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Format current date and time
    const now = new Date();
    const dateString = now.toLocaleDateString('vi-VN');
    const timeString = now.toLocaleTimeString('vi-VN');

    // 2. Save to Google Sheets
    // Columns: STT, Ngày, Giờ, Loại, Số tiền, Nội dung, Nhân viên
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (spreadsheetId && process.env.GOOGLE_CLIENT_EMAIL) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Trang tính 1!A:G', // Adjust if your sheet name is different
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              [stt, dateString, timeString, type, realAmount, description, staff],
            ],
          },
        });
      } catch (sheetError) {
        console.error('Google Sheets Error:', sheetError);
        // Continue to send Telegram message even if sheet fails
      }
    }

    // 3. Send Notification to Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const sttText = stt ? `\n🏷 STT: ${stt}` : '';
      const message = `
🏥 *Thông báo ${type} mới*${sttText}
⏰ Thời gian: ${dateString} ${timeString}
💰 Số tiền: *${realAmount.toLocaleString('vi-VN')} VNĐ*
📝 Nội dung: ${description}
👤 Nhân viên: ${staff}
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
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
