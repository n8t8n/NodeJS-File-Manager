(() => {
  // Configuration
  const config = {
    modelId: "meta-llama/Llama-3-70b-chat-hf",
  };
  let models = [];
  let apiKey;
  let apiUrl;
  let requestCount = 0;
  let requestTime = localStorage.getItem('requestTime') || 0;

  const updateRequestCount = () => {
    const now = new Date().getTime();
    const hourAgo = now - 3600000; // milliseconds in an hour

    if (now - requestTime > 3600000) {
      requestCount = 0;
      requestTime = now;
      localStorage.setItem('requestTime', requestTime);
    }
    localStorage.setItem('requestCount', requestCount);
  };

  const getRequestCount = () => {
    return parseInt(localStorage.getItem('requestCount')) || 0;
  };

  fetch('aimlapi-models.json')
    .then(response => response.json())
    .then(data => {
      models = data.models;
      apiKey = data.apiKey;
      apiUrl = data.apiUrl;
      // Update the model select element with the fetched models
      const modelSelect = document.getElementById("n8t8n-model-select");
      if (modelSelect) {
        modelSelect.innerHTML = models.map(model => `<option value="${model}">${model}</option>`).join('');
        // Set the default model
        const defaultModel = models.find(model => model === config.modelId) || models[0];
        modelSelect.value = defaultModel;
        config.modelId = defaultModel;
      }
    })
    .catch(error => console.error('Error loading models:', error));


  // Create and inject styles
  const injectStyles = async () => {
    const response = await fetch('widget-styles.css');
    const styles = await response.text();
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.appendChild(style);
  };

  // Create chat widget HTML
  const createWidget = () => {
    const widget = document.createElement("div");
    widget.className = "n8t8n-chat-widget";
    widget.innerHTML = `
        <div id="n8t8n-chat-container" style="display: none;">
          <div id="n8t8n-chat-header">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
            AI Assistant
          </div>
                    <div id="n8t8n-request-counter"></div>

          <div id="n8t8n-chat-messages"></div>
          <div id="n8t8n-chat-input-container">
           <select id="n8t8n-model-select">
            </select>
            <form id="n8t8n-chat-form">
              <input type="text" id="n8t8n-chat-input" placeholder="Type your message..." autocomplete="off">
              <button type="submit" id="n8t8n-chat-submit"><i class="bi bi-send"></i></button>
            </form>
          </div>
        </div>
        <button id="n8t8n-chat-toggle">💬</button>
      `;
    document.body.appendChild(widget);
    const requestCounter = document.getElementById('n8t8n-request-counter');
    requestCounter.textContent = `Requests remaining: ${10 - getRequestCount()}`;
  };

  // Handle chat interactions
  const initializeChat = async () => {
    const container = document.getElementById("n8t8n-chat-container");
    const toggle = document.getElementById("n8t8n-chat-toggle");
    const form = document.getElementById("n8t8n-chat-form");
    const input = document.getElementById("n8t8n-chat-input");
    const messages = document.getElementById("n8t8n-chat-messages");
    const modelSelect = document.getElementById("n8t8n-model-select");
    const requestCounter = document.getElementById('n8t8n-request-counter');

    modelSelect.addEventListener("change", () => {
      config.modelId = modelSelect.value;
    });

    toggle.addEventListener("click", () => {
      container.style.display =
        container.style.display === "none" ? "flex" : "none";
      if (container.style.display === "flex") input.focus();
    });

    const appendMessage = (content, type) => {
      const message = document.createElement("div");
      message.className = `n8t8n-message n8t8n-${type}`;
      message.textContent = content;
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    };

    const getAIResponse = async (message) => {
      requestCount = getRequestCount() + 1;
      updateRequestCount();
      const remainingRequests = 10 - requestCount;
      requestCounter.textContent = `Requests remaining: ${remainingRequests}`;
      if (remainingRequests < 0) {
        requestCounter.textContent = "429 Too many requests. Please try again in 1 hour, or get a plan at aimlapi.com.";
        return "Request limit exceeded.";
      }

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.modelId,
            messages: [{ role: "user", content: message }],
            max_tokens: 150,
            stream: false,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            requestCounter.textContent = "429 Too many requests. Please try again in 1 hour, or get a plan at aimlapi.com.";
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content || "No response from AI";
      } catch (error) {
        console.error("AI response error:", error);
        return "Sorry, there was an error processing your request.";
      }
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      input.value = "";
      appendMessage(message, "user");

      const aiResponse = await getAIResponse(message);
      appendMessage(aiResponse, "ai");
    });
  };

  // Initialize the widget
  injectStyles();
  createWidget();
  initializeChat();
})();
