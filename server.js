require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

class ApiService {
  constructor(apiKey) {
    this.BASE_URL = 'https://aplicaciones05.ayto-caceres.es/DesarrolloApi';
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'OpenaAi-ApiKey': apiKey
      }
    });
  }

  // Métodos retrieveRun, listMessages, createThread, createThreadAndRun
  // ... (sin cambios)
}

const app = express();
const port = 3000;
const apiService = new ApiService(process.env.OPENAI_API_KEY);

app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// buildCreateThreadPayload y ruta /api/createThread (no la quitamos):
function buildCreateThreadPayload(messageContent) {
  return {
    messages: [
      {
        role: "user",
        content: messageContent,
        attachments: [],
        metadata: {}
      }
    ],
    tool_resources: {},
    metadata: {}
  };
}

app.post('/api/createThread', async (req, res) => {
  try {
    const messageContent = req.body.message;
    const payload = buildCreateThreadPayload(messageContent);
    const data = await apiService.createThread(payload);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en CreateThread' });
  }
});

// buildCreateThreadAndRunPayload y ruta /api/createThreadAndRun
function buildCreateThreadAndRunPayload(messageContent) {
  return {
    assistant_id: "asst_LaCKtLYCXbB6lHslfYtS9cES",
    thread: {
      messages: [
        {
          role: "user",
          content: messageContent,
          attachments: [],
          metadata: {}
        }
      ],
      metadata: {}
    },
    model: "gpt-4o-mini",
    temperature: 0.7,
    top_p: 1.0,
    stream: false,
    max_prompt_tokens: 4000,
    max_completion_tokens: 4000
  };
}

app.post('/api/createThreadAndRun', async (req, res) => {
  try {
    const messageContent = req.body.message;
    const payload = buildCreateThreadAndRunPayload(messageContent);
    const apiResponse = await apiService.createThreadAndRun(payload);

    console.log("Respuesta completa de la API externa:", apiResponse);

    // Extrae el mensaje del asistente, si lo hay
    const assistantMessage = apiResponse?.thread?.messages?.find(
      (msg) => msg.role === 'assistant'
    );
    const assistantContent = assistantMessage
      ? assistantMessage.content
      : 'No se recibió respuesta del asistente (o está en cola).';

    res.json({
      assistant: assistantContent,
      thread_id: apiResponse.thread_id || apiResponse.thread?.id,
      id: apiResponse.id,
      status: apiResponse.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en CreateThreadAndRun' });
  }
});

// retrieveRun
app.get('/api/retrieveRun', async (req, res) => {
  try {
    const { threadId, runId } = req.query;
    const runData = await apiService.retrieveRun(threadId, runId);
    res.json(runData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en RetrieveRun' });
  }
});

// listMessages
app.get('/api/listMessages', async (req, res) => {
  try {
    const { threadId } = req.query;
    const messagesData = await apiService.listMessages(threadId);
    res.json(messagesData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en listMessages' });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
