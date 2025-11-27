/**
 * Утилиты для работы с insales API
 */

const INSALES_API_KEY = process.env.INSALES_API_KEY || '';
const INSALES_API_SECRET = process.env.INSALES_API_SECRET || '';
const INSALES_SHOP_DOMAIN = process.env.INSALES_SHOP_DOMAIN || '';
const INSALES_OAUTH_REDIRECT_URI = process.env.INSALES_OAUTH_REDIRECT_URI || '';

/**
 * Получить URL для OAuth авторизации insales
 * Insales использует OAuth 2.0 через админ-панель
 */
export function getInsalesAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: INSALES_API_KEY,
    redirect_uri: INSALES_OAUTH_REDIRECT_URI,
    response_type: 'code',
    ...(state && { state }),
  });

  // URL для авторизации в insales (может отличаться в зависимости от версии API)
  // Обычно это: https://{shop}.insales.ru/admin/applications/authorize
  const baseUrl = INSALES_SHOP_DOMAIN.includes('http')
    ? INSALES_SHOP_DOMAIN
    : `https://${INSALES_SHOP_DOMAIN}`;
  
  return `${baseUrl}/admin/applications/authorize?${params.toString()}`;
}

/**
 * Обменять код авторизации на access_token
 * Insales использует стандартный OAuth 2.0 flow
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope?: string;
  refresh_token?: string;
} | null> {
  try {
    const baseUrl = INSALES_SHOP_DOMAIN.includes('http')
      ? INSALES_SHOP_DOMAIN
      : `https://${INSALES_SHOP_DOMAIN}`;

    const response = await fetch(`${baseUrl}/admin/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: INSALES_API_KEY,
        client_secret: INSALES_API_SECRET,
        redirect_uri: INSALES_OAUTH_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ошибка обмена кода на токен:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при обмене кода на токен:', error);
    return null;
  }
}

/**
 * Получить информацию о пользователе из insales
 * Insales API может возвращать данные в разных форматах
 */
export async function getInsalesUser(accessToken: string): Promise<{
  id: number;
  email: string;
  name?: string;
  [key: string]: any;
} | null> {
  try {
    const baseUrl = INSALES_SHOP_DOMAIN.includes('http')
      ? INSALES_SHOP_DOMAIN
      : `https://${INSALES_SHOP_DOMAIN}`;

    // Пробуем получить данные аккаунта
    // В insales может быть endpoint /admin/account.json или другой
    const response = await fetch(`${baseUrl}/admin/account.json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Если не получилось, пробуем альтернативный endpoint
      const altResponse = await fetch(`${baseUrl}/admin/current_account.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!altResponse.ok) {
        console.error('Ошибка получения данных пользователя:', await altResponse.text());
        return null;
      }

      const altData = await altResponse.json();
      return altData.account || altData || null;
    }

    const data = await response.json();
    return data.account || data || null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
}

/**
 * Проверить, настроены ли переменные окружения для insales
 */
export function isInsalesConfigured(): boolean {
  return !!(
    INSALES_API_KEY &&
    INSALES_API_SECRET &&
    INSALES_SHOP_DOMAIN &&
    INSALES_OAUTH_REDIRECT_URI
  );
}

