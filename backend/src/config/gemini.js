const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getGeminiClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '') {
      genAI = new GoogleGenerativeAI(apiKey.trim());
    }
  }
  return genAI;
};

module.exports = { getGeminiClient };
