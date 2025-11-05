import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint to validate OpenRouter API key and connection
app.get('/api/test-openrouter', async (req, res) => {
  try {
    console.log('🔍 Testing OpenRouter API connection...');
    
    // Check if API key exists
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.log('❌ No OPENROUTER_API_KEY found in environment variables');
      return res.status(400).json({
        success: false,
        error: 'No OPENROUTER_API_KEY found in environment variables',
        suggestion: 'Please add your OpenRouter API key to .env.local file'
      });
    }

    // Log API key prefix for debugging (security safe)
    const keyPrefix = apiKey.substring(0, 10) + '...';
    console.log(`🔑 Using API key: ${keyPrefix}`);

    // Test 1: Simple model list request
    console.log('📋 Testing model list endpoint...');
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📋 Models endpoint status: ${modelsResponse.status}`);
    
    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text();
      console.log(`❌ Models endpoint error: ${errorText}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch models from OpenRouter',
        status: modelsResponse.status,
        details: errorText,
        suggestion: 'Check if your API key is valid and has proper permissions'
      });
    }

    const modelsData = await modelsResponse.json();
    console.log(`✅ Successfully fetched ${modelsData.data?.length || 0} models`);

    // Test 2: Simple chat completion with a free model
    console.log('💬 Testing chat completion with free model...');
    const testModel = 'deepseek/deepseek-chat-v3.1:free'; // Use DeepSeek v3.1 free model
    
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'FixRez'
      },
      body: JSON.stringify({
        model: testModel,
        messages: [
          {
            role: 'user',
            content: 'Say "API test successful" if you can read this.'
          }
        ],
        max_tokens: 20
      })
    });

    console.log(`💬 Chat completion status: ${chatResponse.status}`);

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.log(`❌ Chat completion error: ${errorText}`);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch (e) {
        errorDetails = { message: errorText };
      }

      return res.status(500).json({
        success: false,
        error: 'Chat completion failed',
        status: chatResponse.status,
        details: errorDetails,
        model: testModel,
        suggestion: 'Your API key may not have access to this model or may need billing setup'
      });
    }

    const chatData = await chatResponse.json();
    console.log('✅ Chat completion successful!');

    // Return success with diagnostic info
    res.json({
      success: true,
      message: 'OpenRouter API connection successful!',
      diagnostics: {
        apiKeyPrefix: keyPrefix,
        modelsAvailable: modelsData.data?.length || 0,
        testModel: testModel,
        testResponse: chatData.choices?.[0]?.message?.content || 'No response content',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🚨 OpenRouter test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Network or connection error',
      details: error.message,
      suggestion: 'Check your internet connection and API key validity'
    });
  }
});

// Test endpoint for specific model availability
app.post('/api/test-model', async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'Model parameter required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key configured' });
    }

    console.log(`🧪 Testing specific model: ${model}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "FixRez"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      })
    });

    const result = {
      model: model,
      status: response.status,
      success: response.ok
    };

    if (!response.ok) {
      const errorText = await response.text();
      try {
        result.error = JSON.parse(errorText);
      } catch (e) {
        result.error = { message: errorText };
      }
    } else {
      const data = await response.json();
      result.response = data.choices?.[0]?.message?.content;
    }

    console.log(`🧪 Model ${model} test result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);

  } catch (error) {
    console.error('Model test error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🧪 OpenRouter Test Server running on http://localhost:${PORT}`);
  console.log(`🔍 Test your API key at: http://localhost:${PORT}/api/test-openrouter`);
});