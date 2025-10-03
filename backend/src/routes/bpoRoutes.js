const express = require('express');
const router = express.Router();
const bpoController = require('../controllers/bpoController');

// Create new BPO
router.post('/', bpoController.createBPO);

// List BPOs
router.get('/', bpoController.listBPOs);

// Update BPO by id or bpoID (allow status updates)
router.put('/:id', bpoController.updateBPO);

// Get single BPO
router.get('/:id', bpoController.getBPO);

// Soft-delete BPO (soft delete sets deleted=true and deletedAt)
router.delete('/:id', bpoController.deleteBPO);

// Note: Update (PUT) is enabled for controlled status edits; DELETE exposes the soft-delete endpoint.

module.exports = router;

