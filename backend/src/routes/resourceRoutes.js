const express = require('express');
const router = express.Router();
const Resource = require('../models/Resources');

// GET /api/resources - public list of available resources (non-closed)
router.get('/', async (req, res, next) => {
	try {
		const list = await Resource.getAvailableResources();
		res.json({ success: true, data: list });
	} catch (err) {
		next(err);
	}
});

module.exports = router;
