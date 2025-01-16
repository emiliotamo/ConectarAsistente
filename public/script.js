document.addEventListener('DOMContentLoaded', () => {
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const chatLog = document.getElementById('chatLog');

  // Mensaje de bienvenida de parte del asistente
  addMessageToChat(
    'Hola, bienvenido al asistente virtual Calculadora. Indica tu cuenta matemática:',
    'assistant'
  );
  // El único listener es el de sendButton
  sendButton.addEventListener('click', sendMessage);

  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessageToChat(message, 'user');

    // Usamos la ruta de createThreadAndRun
    fetch('/api/createThreadAndRun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Si createThreadAndRun devuelve thread_id y id (del run),
        // hacemos poll a retrieveRun
        if (!data.thread_id || !data.id) {
          addMessageToChat(
            'No se pudo iniciar el proceso (faltan datos en la respuesta).',
            'assistant'
          );
          return;
        }
        pollRunStatus(data.thread_id, data.id);
      })
      .catch(err => {
        console.error(err);
        addMessageToChat('Ocurrió un error al procesar la solicitud', 'assistant');
      });

    userInput.value = '';
  }


  function pollRunStatus(threadId, runId) {
    fetch(`/api/retrieveRun?threadId=${threadId}&runId=${runId}`)
      .then(response => response.json())
      .then(runData => {
        console.log('Run data:', runData);
  
        if (runData.status === 'completed') {
          // Cuando el run está listo, consultamos la lista de mensajes
          fetch(`/api/listMessages?threadId=${threadId}`)
            .then(res => res.json())
            .then(data => {
              console.log('Messages data:', data);
  
              const messagesArray = data.data ? data.data : data;
              const assistantMessage = messagesArray.find(m => m.role === 'assistant');
  
              if (!assistantMessage) {
                addMessageToChat('No se encontró un mensaje del asistente en este hilo.', 'assistant');
                return;
              }
  
              const firstContent = assistantMessage.content?.[0];
              const assistantText = firstContent?.text?.value || 'El mensaje del asistente no contiene texto.';
  
              addMessageToChat(assistantText, 'assistant');
            })
            .catch(err => {
              console.error('Error al recuperar la lista de mensajes:', err);
              addMessageToChat('Error al recuperar los mensajes del hilo', 'assistant');
            });
        } else if (runData.status === 'queued' || runData.status === 'in_progress') {
          // Sigue esperando
          setTimeout(() => pollRunStatus(threadId, runId), 3000);
        } else {
          // Manejar estados como 'incomplete', 'failed', etc.
          console.error('Run en estado inesperado:', runData.status);
          addMessageToChat(`El run falló o se canceló (estado: ${runData.status})`, 'assistant');
        }
      })
      .catch(err => {
        console.error('Error en pollRunStatus:', err);
        addMessageToChat('Error recuperando el run', 'assistant');
      });
  }
  
  function addMessageToChat(text, role) {
    const messageElem = document.createElement('div');
    messageElem.classList.add('message', role);
    messageElem.innerText = text;
    chatLog.appendChild(messageElem);

    chatLog.scrollTop = chatLog.scrollHeight;
  }
});
