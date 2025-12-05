// incidentSubtypesRoutes.js
const express = require('express');
const router = express.Router();
const incidentSubtypesController = require('../controllers/incidentSubtypesController');

/**
 * GET /api/metadata
 * Get system metadata including incident types and subtypes
 */
router.get('/', incidentSubtypesController.getMetadata);

/**
 * GET /api/metadata/incident-types
 * Get all incident types with available subtypes for each type
 */
router.get('/incident-types', incidentSubtypesController.getIncidentTypesWithSubtypes);

/**
 * GET /api/metadata/keyword-mappings
 * Get all keyword mappings for detecting subtypes (English and Tagalog)
 */
router.get('/keyword-mappings', incidentSubtypesController.getKeywordMappings);

module.exports = router;
