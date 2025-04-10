const { Client } = require('@googlemaps/google-maps-services-js');

// Initialize Google Maps client
const client = new Client({});

// Verify API key is configured
const verifyGoogleMapsConfig = () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured in environment variables');
  }
  return apiKey;
};

const validateAndGeocodeAddress = async (addressData) => {
  try {
    const apiKey = verifyGoogleMapsConfig();
    const { street, city, state, zipCode } = addressData;
    const address = `${street}, ${city}, ${state} ${zipCode}`;

    console.log('Geocoding address:', address);
    
    const response = await client.geocode({
      params: {
        address,
        key: apiKey,
        region: 'in' // Add region bias for India
      },
      timeout: 5000 // 5 second timeout
    });

    if (response.data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', response.data.error_message);
      throw new Error('Google Maps API request denied: ' + response.data.error_message);
    }

    if (response.data.status !== 'OK') {
      console.error('Geocoding failed with status:', response.data.status);
      throw new Error('Could not validate address: ' + response.data.status);
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    
    return {
      success: true,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      },
      googlePlaceData: result
    };
  } catch (error) {
    console.error('Error validating address:', error);
    
    // Provide more specific error messages
    if (error.response) {
      console.error('Google Maps API response:', error.response.data);
      return {
        success: false,
        error: `Google Maps API error: ${error.response.data.error_message || error.response.status}`
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

const reverseGeocode = async (latitude, longitude) => {
  try {
    const apiKey = verifyGoogleMapsConfig();
    console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);

    const response = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: apiKey,
        region: 'in' // Add region bias for India
      },
      timeout: 5000
    });

    if (response.data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', response.data.error_message);
      throw new Error('Google Maps API request denied: ' + response.data.error_message);
    }

    if (response.data.status !== 'OK') {
      console.error('Reverse geocoding failed with status:', response.data.status);
      throw new Error('Could not reverse geocode location: ' + response.data.status);
    }

    const result = response.data.results[0];
    const addressComponents = result.address_components;
    
    // Parse address components
    const address = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };

    addressComponents.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number') || types.includes('route')) {
        address.street = address.street 
          ? `${address.street} ${component.long_name}`
          : component.long_name;
      }
      if (types.includes('sublocality_level_1') || types.includes('locality')) {
        address.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        address.state = component.long_name;
      }
      if (types.includes('postal_code')) {
        address.zipCode = component.long_name;
      }
    });

    return {
      success: true,
      address,
      googlePlaceData: result
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    
    if (error.response) {
      console.error('Google Maps API response:', error.response.data);
      return {
        success: false,
        error: `Google Maps API error: ${error.response.data.error_message || error.response.status}`
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

const searchNearbyPlaces = async (latitude, longitude, radius = 5000, type = 'restaurant') => {
  try {
    const apiKey = verifyGoogleMapsConfig();
    console.log(`Searching nearby ${type}s at ${latitude}, ${longitude} within ${radius}m`);

    const response = await client.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius,
        type,
        key: apiKey,
      },
      timeout: 5000
    });

    if (response.data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', response.data.error_message);
      throw new Error('Google Maps API request denied: ' + response.data.error_message);
    }

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Nearby search failed with status:', response.data.status);
      throw new Error('Could not find nearby places: ' + response.data.status);
    }

    return {
      success: true,
      places: response.data.results
    };
  } catch (error) {
    console.error('Error searching nearby places:', error);
    
    if (error.response) {
      console.error('Google Maps API response:', error.response.data);
      return {
        success: false,
        error: `Google Maps API error: ${error.response.data.error_message || error.response.status}`
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  validateAndGeocodeAddress,
  reverseGeocode,
  searchNearbyPlaces
};