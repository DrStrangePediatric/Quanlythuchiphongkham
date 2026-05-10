import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password, type } = await request.json();
    
    if (!password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    if (type === 'app') {
      const appPassword = process.env.APP_PASSWORD;
      if (!appPassword || password === appPassword) {
        // If not set, or matches
        return NextResponse.json({ success: true, role: 'staff' });
      }
    } else if (type === 'admin') {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || password === adminPassword) {
        return NextResponse.json({ success: true, role: 'admin' });
      }
    }

    return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
