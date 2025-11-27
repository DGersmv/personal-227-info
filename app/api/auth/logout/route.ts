import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Удаляем токен из cookie
  cookieStore.delete('token');
  
  // Возвращаем ответ с очисткой cookie
  const response = NextResponse.json({ success: true });
  response.cookies.delete('token');
  
  return response;
}

