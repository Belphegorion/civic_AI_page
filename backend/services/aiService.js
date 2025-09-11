// backend/services/aiService.js
const { InferenceClient } = require('@huggingface/inference');
const logger = require('../utils/logger');

let hfClient = null;

// This function is called from server.js on startup
const initializeAI = () => {
  if (process.env.HF_TOKEN) {
    try {
      hfClient = new InferenceClient(process.env.HF_TOKEN);
      logger.info('Hugging Face Inference Client initialized successfully.');
      return true;
    } catch (err) {
      logger.error('Failed to initialize Hugging Face Inference Client: %s', err.message);
      hfClient = null;
      return false;
    }
  } else {
    logger.warn('HF_TOKEN not found in environment variables. AI service will be disabled.');
    hfClient = null;
    return false;
  }
};

// This function is called by the report worker
const analyzeImageBuffer = async (buffer) => {
  // If the client isn't initialized, return a default response
  if (!hfClient) {
    logger.warn('analyzeImageBuffer called but HF client is not initialized.');
    return { labels: [], confidence: 0, detectedIssues: [] };
  }

  try {
    const results = await hfClient.imageClassification({
      data: buffer,
      model: 'google/vit-base-patch16-224',
    });

    if (!results || results.length === 0) {
      return { labels: [], confidence: 0, detectedIssues: [] };
    }

    // Extract labels and find the highest confidence score
    const labels = results.map(r => r.label);
    const confidence = results[0].score; // The first result is usually the highest score

    // Re-implement the detected issues logic based on the new labels
    const detectedIssues = [];
    const labelString = labels.join(' ').toLowerCase();

    if (/\b(pothole|asphalt|road|crack)\b/i.test(labelString)) {
      detectedIssues.push('pothole');
    }
    if (/\b(light|lamp|bulb|streetlight)\b/i.test(labelString)) {
      detectedIssues.push('streetlight');
    }
    if (/\b(trash|garbage|litter|waste|bin)\b/i.test(labelString)) {
        detectedIssues.push('trash');
    }
    if (/\b(graffiti|paint|spray)\b/i.test(labelString)) {
        detectedIssues.push('graffiti');
    }
    if (/\b(water|leak|pipe|flood)\b/i.test(labelString)) {
        detectedIssues.push('water_leak');
    }
     if (/\b(tree|branch|hazard)\b/i.test(labelString)) {
        detectedIssues.push('tree_hazard');
    }

    logger.info('Image analysis complete. Top label: %s, Confidence: %f', labels[0], confidence);

    return {
      labels: labels.slice(0, 10), // Return top 10 labels
      confidence,
      detectedIssues,
    };

  } catch (err) {
    logger.error('Hugging Face image analysis failed: %s', err.message);
    // Return a default response on error to avoid breaking the worker
    return { labels: [], confidence: 0, detectedIssues: [] };
  }
};

module.exports = { initializeAI, analyzeImageBuffer };
