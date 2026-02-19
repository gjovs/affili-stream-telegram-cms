import crypto from 'crypto';

const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const SHOPEE_API_BASE = 'https://partner.shopeemobile.com';

interface ShopeeProductInfo {
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  itemId: number;
  shopId: number;
}

/**
 * Generate signature for Shopee API
 * Signature = HMAC-SHA256(partner_key, partner_id + api_path + timestamp + access_token + shop_id)
 */
function generateSignature(path: string, timestamp: number, accessToken?: string, shopId?: number): string {
  let baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
  
  if (accessToken) {
    baseString += accessToken;
  }
  
  if (shopId) {
    baseString += shopId;
  }
  
  return crypto
    .createHmac('sha256', SHOPEE_PARTNER_KEY)
    .update(baseString)
    .digest('hex');
}

/**
 * Extract shop_id and item_id from Shopee URL
 * Formats:
 * - https://shopee.com.br/product/123456/789012
 * - https://shopee.com.br/Nome-do-Produto-i.123456.789012
 * - https://shopee.com.br/product-name-i.123456.789012
 */
export function extractShopeeIds(url: string): { shopId: number; itemId: number } | null {
  try {
    // Format: /product/shopId/itemId
    const productMatch = url.match(/\/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return {
        shopId: parseInt(productMatch[1]),
        itemId: parseInt(productMatch[2]),
      };
    }
    
    // Format: i.shopId.itemId
    const iMatch = url.match(/i\.(\d+)\.(\d+)/);
    if (iMatch) {
      return {
        shopId: parseInt(iMatch[1]),
        itemId: parseInt(iMatch[2]),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get product details from Shopee API (Public endpoint - no auth required)
 * Note: This uses the public API endpoint that doesn't require shop authorization
 */
export async function getShopeeProductFromApi(url: string): Promise<ShopeeProductInfo | null> {
  const ids = extractShopeeIds(url);
  
  if (!ids) {
    console.error('Could not extract Shopee IDs from URL:', url);
    return null;
  }
  
  const { shopId, itemId } = ids;
  
  try {
    // Use the public Shopee API endpoint for item details
    // This endpoint is available for affiliate partners
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_base_info';
    const sign = generateSignature(path, timestamp);
    
    const params = new URLSearchParams({
      partner_id: SHOPEE_PARTNER_ID,
      timestamp: timestamp.toString(),
      sign,
      item_id_list: itemId.toString(),
      shop_id: shopId.toString(),
    });
    
    const response = await fetch(`${SHOPEE_API_BASE}${path}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Shopee API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Shopee API returned error:', data.error, data.message);
      return null;
    }
    
    const item = data.response?.item_list?.[0];
    
    if (!item) {
      console.error('No item found in Shopee API response');
      return null;
    }
    
    // Extract price (Shopee prices are in cents)
    const price = (item.price_info?.current_price || item.price_info?.min_price || 0) / 100000;
    const originalPrice = (item.price_info?.original_price || 0) / 100000;
    
    return {
      title: item.item_name || '',
      image: item.image?.image_url_list?.[0] || item.image?.image_id_list?.[0] || '',
      price: price > 0 ? price : 0,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      itemId,
      shopId,
    };
  } catch (error) {
    console.error('Error fetching from Shopee API:', error);
    return null;
  }
}

/**
 * Alternative: Scrape from Shopee's internal API (used by the website)
 * This doesn't require authentication but may be rate-limited
 */
export async function getShopeeProductFromInternalApi(url: string): Promise<ShopeeProductInfo | null> {
  const ids = extractShopeeIds(url);
  
  if (!ids) {
    console.error('Could not extract Shopee IDs from URL:', url);
    return null;
  }
  
  const { shopId, itemId } = ids;
  
  try {
    // Shopee internal API endpoint (used by the website)
    const apiUrl = `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://shopee.com.br/',
        'x-api-source': 'pc',
        'x-requested-with': 'XMLHttpRequest',
        'x-shopee-language': 'pt-BR',
      },
    });
    
    if (!response.ok) {
      console.error('Shopee internal API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error || !data.data) {
      console.error('Shopee internal API returned error:', data.error);
      return null;
    }
    
    const item = data.data;
    
    // Shopee prices are in cents (multiply by 100000 in their system)
    const price = (item.price || item.price_min || 0) / 100000;
    const originalPrice = (item.price_before_discount || 0) / 100000;
    
    // Get the main image
    const imageId = item.image || item.images?.[0] || '';
    const imageUrl = imageId ? `https://down-br.img.susercontent.com/file/${imageId}` : '';
    
    return {
      title: item.name || '',
      image: imageUrl,
      price: price > 0 ? price : 0,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      itemId,
      shopId,
    };
  } catch (error) {
    console.error('Error fetching from Shopee internal API:', error);
    return null;
  }
}

/**
 * Main function to get Shopee product info
 * Tries the internal API first (more reliable), then falls back to partner API
 */
export async function getShopeeProduct(url: string): Promise<ShopeeProductInfo | null> {
  // Try internal API first (more reliable for public product data)
  const internalResult = await getShopeeProductFromInternalApi(url);
  
  if (internalResult && internalResult.title && internalResult.price > 0) {
    console.log('Got Shopee product from internal API:', internalResult.title);
    return internalResult;
  }
  
  // Fall back to partner API if internal API fails
  if (SHOPEE_PARTNER_ID && SHOPEE_PARTNER_KEY) {
    const apiResult = await getShopeeProductFromApi(url);
    if (apiResult && apiResult.title) {
      console.log('Got Shopee product from partner API:', apiResult.title);
      return apiResult;
    }
  }
  
  console.error('Could not fetch Shopee product from any source');
  return null;
}

/**
 * Check if URL is a Shopee URL
 */
export function isShopeeUrl(url: string): boolean {
  return url.includes('shopee.com');
}
