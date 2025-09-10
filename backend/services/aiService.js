const fs = require('fs');
let tf = null;
let visionClient = null;

const initTF = async () => {
  try {
    tf = require('@tensorflow/tfjs-node');
    console.log('tfjs-node loaded');
    return true;
  } catch (err) {
    console.warn('tfjs-node not available:', err.message);
    tf = null;
    return false;
  }
};

const initGoogleVision = () => {
  try {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();
    console.log('Google Vision client ready');
    return true;
  } catch (err) {
    console.warn('google-vision not configured or not installed', err.message);
    visionClient = null;
    return false;
  }
};

let model = null;
const loadModel = async () => {
  if (!process.env.USE_TF_MODEL || process.env.USE_TF_MODEL === 'false') return null;
  const ok = await initTF();
  if (!ok) return null;
  const modelDir = process.env.TF_MODEL_DIR;
  if (!modelDir) {
    console.warn('TF_MODEL_DIR not provided');
    return null;
  }
  try {
    model = await tf.node.loadSavedModel(modelDir);
    console.log('TF SavedModel loaded from', modelDir);
    return model;
  } catch (err) {
    console.warn('Failed loading TF model', err.message);
    model = null;
    return null;
  }
};

const initializeAI = async () => {
  if (process.env.USE_GOOGLE_VISION === 'true') initGoogleVision();
  if (process.env.USE_TF_MODEL === 'true') await loadModel();
  console.log('AI service initialized');
};

const preprocessForTF = (buffer) => {
  const image = tf.node.decodeImage(buffer, 3);
  const resized = tf.image.resizeBilinear(image, [224, 224]).div(255.0).expandDims(0);
  return resized;
};

const analyzeImageBuffer = async (buffer) => {
  if (model && tf) {
    try {
      const input = preprocessForTF(buffer);
      const output = model.predict(input);
      const scores = output.dataSync ? Array.from(output.dataSync()) : [0.5];
      const labels = ['detected'];
      return { labels, confidence: scores[0], detectedIssues: [] };
    } catch (err) {
      console.warn('TF analysis failed', err.message);
    }
  }

  if (visionClient) {
    try {
      const [result] = await visionClient.labelDetection({ image: { content: buffer } });
      const labels = (result.labelAnnotations || []).map(l => l.description).slice(0, 10);
      const confidence = (result.labelAnnotations && result.labelAnnotations[0] && result.labelAnnotations[0].score) || 0.6;
      const detectedIssues = [];
      if (labels.some(l => /pothole|asphalt|road|crack/i.test(l))) detectedIssues.push('pothole');
      if (labels.some(l => /light|lamp|bulb/i.test(l))) detectedIssues.push('streetlight');
      return { labels, confidence, detectedIssues };
    } catch (err) {
      console.warn('Google Vision failed', err.message);
    }
  }

  try {
    const sizeKb = buffer.length / 1024;
    const labels = [sizeKb > 150 ? 'large_image' : 'small_image'];
    const detectedIssues = [];
    return { labels, confidence: 0.5, detectedIssues };
  } catch (err) {
    return { labels: [], confidence: 0, detectedIssues: [] };
  }
};

module.exports = { initializeAI, analyzeImageBuffer, loadModel };
