#!/usr/bin/env node

require('dotenv').config();
const { initElasticsearch } = require('../config/elasticsearch');
const searchService = require('../services/search');

async function reindexData() {
  console.log('Starting reindex process...');
  
  try {
    // Initialize Elasticsearch
    const client = await initElasticsearch();
    
    if (!client) {
      console.error('Failed to initialize Elasticsearch. Make sure Elasticsearch is running and configured.');
      process.exit(1);
    }
    
    // Reindex all data
    await searchService.reindexAll();
    
    console.log('Reindex completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Reindex failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  reindexData();
}

module.exports = reindexData;