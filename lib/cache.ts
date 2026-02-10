/**
 * Simple in-memory cache for API responses
 * Prevents excessive API calls during development
 */

interface CacheEntry {
    data: any;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Cache süresi (milisaniye cinsinden)
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

/**
 * Cache'den veri al veya yoksa fetch yap
 */
export async function fetchWithCache(
    key: string,
    fetcher: () => Promise<any>,
    cacheDuration: number = CACHE_DURATION
): Promise<any> {
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
        console.log(`Cache hit for key: ${key}`);
        return cached.data;
    }

    console.log(`Cache miss for key: ${key}, fetching fresh data...`);
    const data = await fetcher();

    cache.set(key, {
        data,
        timestamp: Date.now(),
    });

    return data;
}

/**
 * Cache'i temizle
 */
export function clearCache(key?: string) {
    if (key) {
        cache.delete(key);
        console.log(`Cache cleared for key: ${key}`);
    } else {
        cache.clear();
        console.log('All cache cleared');
    }
}

/**
 * Cache istatistiklerini göster
 */
export function getCacheStats() {
    return {
        size: cache.size,
        keys: Array.from(cache.keys()),
    };
}
