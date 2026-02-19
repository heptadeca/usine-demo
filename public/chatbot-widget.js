(function() {
  'use strict';

  if (window.ChatbotWidget) {
    console.warn('Chatbot widget already loaded');
    return;
  }

  window.ChatbotWidget = {
    init: function(config) {
      if (!config.botId) {
        console.error('Chatbot widget: botId is required');
        return;
      }

      const botId = config.botId;
      const origin = config.origin || window.location.origin;
      const primaryColor = config.primaryColor || '#8eb4e3';

      const styles = `
        #chatbot-widget-container * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        #chatbot-widget-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }

        .chatbot-bubble-button {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: ${primaryColor};
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .chatbot-bubble-button:hover {
          transform: scale(1.05);
          opacity: 0.9;
        }

        .chatbot-bubble-button:active {
          transform: scale(0.95);
        }

        .chatbot-bubble-button.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0);
        }

        .chatbot-bubble-button img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        .chatbot-bubble-window {
          position: fixed;
          bottom: 104px;
          right: 24px;
          width: 400px;
          height: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
          z-index: 999998;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }

        .chatbot-bubble-window.open {
          display: flex;
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .chatbot-bubble-window.minimized {
          height: 64px;
        }

        .chatbot-bubble-close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 1000000;
        }

        .chatbot-bubble-close-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .chatbot-bubble-close-button svg {
          width: 16px;
          height: 16px;
          color: white;
        }

        .chatbot-bubble-iframe {
          flex: 1;
          border: none;
          width: 100%;
          height: 100%;
          display: none;
        }

        .chatbot-bubble-window.open .chatbot-bubble-iframe {
          display: block;
        }

        .chatbot-bubble-window.minimized .chatbot-bubble-iframe {
          display: none;
        }

        @media (max-width: 480px) {
          #chatbot-widget-container {
            right: 16px;
            bottom: 16px;
          }

          .chatbot-bubble-window {
            width: calc(100vw - 32px);
            height: calc(100vh - 140px);
            right: 16px;
            bottom: 90px;
          }

          .chatbot-bubble-button {
            width: 56px;
            height: 56px;
          }

          .chatbot-bubble-button img {
            width: 28px;
            height: 28px;
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);

      const container = document.createElement('div');
      container.id = 'chatbot-widget-container';
      container.innerHTML = `
        <button class="chatbot-bubble-button" id="chatbot-bubble-button" aria-label="Ouvrir le chat">
          <img src="${origin}/image.png" alt="Chat" />
        </button>

        <div class="chatbot-bubble-window" id="chatbot-bubble-window">
          <button class="chatbot-bubble-close-button" id="chatbot-close-button" title="Fermer" aria-label="Fermer" style="background:rgba(255,255,255,0.2)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <iframe class="chatbot-bubble-iframe" id="chatbot-iframe" src="${origin}/demo/${botId}"></iframe>
        </div>
      `;

      document.body.appendChild(container);

      const button = document.getElementById('chatbot-bubble-button');
      const chatWindow = document.getElementById('chatbot-bubble-window');
      const closeButton = document.getElementById('chatbot-close-button');

      button.addEventListener('click', function() {
        chatWindow.classList.add('open');
        button.classList.add('hidden');
      });

      closeButton.addEventListener('click', function() {
        chatWindow.classList.remove('open');
        button.classList.remove('hidden');
      });
    }
  };
})();
