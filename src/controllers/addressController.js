const Address = require('../models/addressModel');
const { validateAndGeocodeAddress, reverseGeocode, searchNearbyPlaces } = require('../utils/googleMapsUtils');
const { validationResult } = require('express-validator');

// Add a new address
const addAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { type, label, street, landmark, city, state, zipCode, isDefault } = req.body;

    // Validate and geocode address using Google Maps
    const geocodeResult = await validateAndGeocodeAddress({
      street, city, state, zipCode
    });

    if (!geocodeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address',
        error: geocodeResult.error
      });
    }

    // If setting as default, unset any existing default address
    if (isDefault) {
      await Address.updateMany(
        { userId: req.user._id, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // Create new address
    const address = new Address({
      userId: req.user._id,
      type,
      label,
      street,
      landmark,
      city,
      state,
      zipCode,
      location: geocodeResult.location,
      isDefault: isDefault || false,
      formattedAddress: geocodeResult.formattedAddress,
      placeId: geocodeResult.placeId,
      googlePlaceData: geocodeResult.googlePlaceData
    });

    await address.save();

    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address
    });
  } catch (error) {
    console.error('Error adding address:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding address',
      error: error.message
    });
  }
};

// Get all addresses for a user
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching addresses',
      error: error.message
    });
  }
};

// Update an address
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { type, label, street, landmark, city, state, zipCode, isDefault } = req.body;

    // Check if address exists and belongs to user
    const address = await Address.findOne({
      _id: addressId,
      userId: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Validate and geocode new address if location details changed
    if (street || city || state || zipCode) {
      const geocodeResult = await validateAndGeocodeAddress({
        street: street || address.street,
        city: city || address.city,
        state: state || address.state,
        zipCode: zipCode || address.zipCode
      });

      if (!geocodeResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid address',
          error: geocodeResult.error
        });
      }

      address.location = geocodeResult.location;
      address.formattedAddress = geocodeResult.formattedAddress;
      address.placeId = geocodeResult.placeId;
      address.googlePlaceData = geocodeResult.googlePlaceData;
    }

    // Update fields
    if (type) address.type = type;
    if (label) address.label = label;
    if (street) address.street = street;
    if (landmark) address.landmark = landmark;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;

    // Handle default address changes
    if (isDefault !== undefined) {
      if (isDefault && !address.isDefault) {
        // Unset any existing default address
        await Address.updateMany(
          { userId: req.user._id, isDefault: true },
          { $set: { isDefault: false } }
        );
      }
      address.isDefault = isDefault;
    }

    await address.save();

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
};

// Delete an address
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If deleted address was default, make the most recent address default
    if (address.isDefault) {
      const mostRecentAddress = await Address.findOne({ userId: req.user._id })
        .sort({ createdAt: -1 });

      if (mostRecentAddress) {
        mostRecentAddress.isDefault = true;
        await mostRecentAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting address',
      error: error.message
    });
  }
};

// Get address suggestions from coordinates
const getAddressSuggestions = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const result = await reverseGeocode(parseFloat(latitude), parseFloat(longitude));

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not get address suggestions',
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.address
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting address suggestions',
      error: error.message
    });
  }
};

// Search nearby places
const searchNearby = async (req, res) => {
  try {
    const { latitude, longitude, radius, type } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const result = await searchNearbyPlaces(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseInt(radius) : undefined,
      type
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not find nearby places',
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.places
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error searching nearby places',
      error: error.message
    });
  }
};

module.exports = {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  getAddressSuggestions,
  searchNearby
};