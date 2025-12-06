// incidentSubtypesController.js
const { getIncidentTypes, KEYWORD_MAPPING } = require('../utils/subtypeDetection');

/**
 * Get all incident types with their subtypes
 * GET /api/metadata/incident-types
 * Returns all available incident types and their associated subtypes
 */
const getIncidentTypesWithSubtypes = (req, res) => {
  try {
    const incidentTypes = getIncidentTypes();
    res.status(200).json({
      success: true,
      data: incidentTypes,
      message: 'Incident types and subtypes retrieved successfully'
    });
  } catch (err) {
    console.error('Error fetching incident types:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident types and subtypes',
      error: err.message
    });
  }
};

/**
 * Get keyword mappings for subtype detection
 * GET /api/metadata/keyword-mappings
 * Returns all keywords for detecting subtypes (English and Tagalog)
 */
const getKeywordMappings = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: KEYWORD_MAPPING,
      message: 'Keyword mappings retrieved successfully'
    });
  } catch (err) {
    console.error('Error fetching keyword mappings:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch keyword mappings',
      error: err.message
    });
  }
};

/**
 * Get system metadata including incident types configuration
 * GET /api/metadata
 * Returns system configuration data with incident types and API version info
 */
const getMetadata = (req, res) => {
  try {
    const incidentTypes = getIncidentTypes();
    
    res.status(200).json({
      success: true,
      data: {
        incidentTypes,
        version: process.env.API_VERSION || '1.0.0',
        timestamp: new Date().toISOString()
      },
      message: 'System metadata retrieved successfully'
    });
  } catch (err) {
    console.error('Error fetching metadata:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metadata',
      error: err.message
    });
  }
};

module.exports = {
  getIncidentTypesWithSubtypes,
  getKeywordMappings,
  getMetadata
};
