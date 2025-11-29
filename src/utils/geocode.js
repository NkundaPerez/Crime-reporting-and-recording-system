// src/utils/geocode.js
export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(',');
      return parts[0].trim() + (parts[1] ? ', ' + parts[1].trim() : '');
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export const forwardGeocode = async (address) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (err) {
    console.error('Forward geocoding failed:', err);
    return null;
  }
};