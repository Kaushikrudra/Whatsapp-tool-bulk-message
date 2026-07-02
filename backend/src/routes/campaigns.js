const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  duplicateCampaign,
  exportCampaignReport,
} = require('../controllers/campaignsController');

// POST /api/campaigns - Create a new campaign
router.post('/', createCampaign);

// GET /api/campaigns - Get all campaigns with statistics
router.get('/', getCampaigns);

// GET /api/campaigns/:id - Get specific campaign detail with paginated contacts and logs
router.get('/:id', getCampaignById);

// POST /api/campaigns/:id/launch - Launch/start a campaign
router.post('/:id/launch', launchCampaign);

// PATCH /api/campaigns/:id/pause - Pause a running campaign
router.patch('/:id/pause', pauseCampaign);

// PATCH /api/campaigns/:id/resume - Resume a paused campaign
router.patch('/:id/resume', resumeCampaign);

// DELETE /api/campaigns/:id - Delete a draft or completed campaign
router.delete('/:id', deleteCampaign);

// POST /api/campaigns/:id/duplicate - Duplicate an existing campaign as a draft copy
router.post('/:id/duplicate', duplicateCampaign);

// GET /api/campaigns/:id/export - Export campaign contact reports as a CSV download
router.get('/:id/export', exportCampaignReport);

module.exports = router;
