const express = require('express');
const router = express.Router();
const casesController = require('../controllers/casesController');

router.post('/', casesController.createCase);
router.get('/', casesController.listCases);
router.get('/:id', casesController.getCase);
router.put('/:id', casesController.updateCase);
router.delete('/:id', casesController.deleteCase);

module.exports = router;
