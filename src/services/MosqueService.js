import AsyncStorage from '@react-native-async-storage/async-storage';
import { CITY_COORDINATES } from '../constants/cities';

const MOSQUE_CACHE_KEY_PREFIX = 'mosque_cache_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 gün

export { CITY_COORDINATES };

export const getMosquesByLocation = async (lat, lng, radius = 5000) => {
  try {
    console.log(`Konum (${lat}, ${lng}) çevresindeki camiler çekiliyor...`);
    
    // Cache key based on lat/lng (rounded to ~1km to avoid too many keys if user moves slightly)
    const latKey = lat.toFixed(2);
    const lngKey = lng.toFixed(2);
    const cacheKey = `${MOSQUE_CACHE_KEY_PREFIX}loc_${latKey}_${lngKey}`;
    
    // Cache check
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
         console.log('Camiler cache\'den alındı.');
         return data;
      }
    }

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
        relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
      );
      out center; 
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    if (!response.ok) {
        throw new Error('Overpass API error');
    }

    const json = await response.json();
    const mosques = [];

    json.elements.forEach((element) => {
        let name = element.tags?.name;
        if (!name && element.tags?.['name:tr']) name = element.tags['name:tr'];
        if (!name && element.tags?.['name:en']) name = element.tags['name:en'];
        
        // Use center for ways/relations if available
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;

        if (name && lat && lon) {
            mosques.push({
                id: element.id.toString(),
                name: name,
                coordinate: {
                    latitude: lat,
                    longitude: lon,
                },
                isManual: false,
            });
        }
    });

    // Save to cache
    if (mosques.length > 0) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: mosques,
            timestamp: Date.now(),
        }));
    }

    return mosques;
  } catch (error) {
    console.error('getMosquesByLocation hatası:', error);
    return [];
  }
};

export const getCityMosques = async (city, forceRefresh = false) => {
    const coords = CITY_COORDINATES[city];
    if (!coords) return [];
    // Use the location-based fetch for the city center
    return getMosquesByLocation(coords.lat, coords.lng, 5000);
};

export const getMosqueCacheInfo = async () => {
    // Basitçe tüm key'leri tarayıp mosque_cache olanları sayabiliriz
    // Şimdilik null dönelim, ilerde detaylandırılabilir
    return null;
};
