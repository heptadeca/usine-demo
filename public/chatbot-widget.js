(function () {
  'use strict';

  if (window.ChatbotWidget) {
    console.warn('Chatbot widget already loaded');
    return;
  }

  var DEFAULT_COLOR = '#8eb4e3';

  // Public Supabase credentials (anon key is safe to expose)
  var SUPABASE_URL = 'https://ohselczgjdehzqphxpou.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VsY3pnamRlaHpxcGh4cG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjU1MTgsImV4cCI6MjA4NzU0MTUxOH0.aYf7Y5Sg8ZfGieaz0xdUY4Q1KJJwl1_tL3j-e15XxPA';

  function getLuminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    function toLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function buildWidget(botId, origin, primaryColor) {
    var color = primaryColor || DEFAULT_COLOR;

    var styles = `
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

      #chatbot-bubble-button.chatbot-bubble-button {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: ${color} !important;
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
        border: 2px solid ${color};
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

    var styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    var container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    container.innerHTML = `
      <button class="chatbot-bubble-button" id="chatbot-bubble-button" aria-label="Ouvrir le chat">
        <img src="${origin}/chat-bubbles-svgrepo-com.svg" alt="Chat" id="chatbot-bubble-icon" />
      </button>

      <div class="chatbot-bubble-window" id="chatbot-bubble-window">
        <button class="chatbot-bubble-close-button" id="chatbot-close-button" title="Fermer" aria-label="Fermer" style="background:rgba(255,255,255,0.2)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <iframe class="chatbot-bubble-iframe" id="chatbot-iframe" src="${origin}/demo/${botId}?primaryColor=${encodeURIComponent(color)}"></iframe>
      </div>
    `;

    document.body.appendChild(container);

    var lum = getLuminance(color);
    var iconFilter = lum > 0.35 ? 'brightness(0)' : 'brightness(0) invert(1)';
    var icon = document.getElementById('chatbot-bubble-icon');
    if (icon) icon.style.filter = iconFilter;

    var button = document.getElementById('chatbot-bubble-button');
    var chatWindow = document.getElementById('chatbot-bubble-window');
    var closeButton = document.getElementById('chatbot-close-button');

    // Fallback: Force background color if not applied by CSS
    if (button) {
      button.style.setProperty('background-color', color, 'important');
    }

    button.addEventListener('click', function () {
      chatWindow.classList.add('open');
      button.classList.add('hidden');
    });

    closeButton.addEventListener('click', function () {
      chatWindow.classList.remove('open');
      button.classList.remove('hidden');
    });
  }

  function fetchBotColor(botId, supabaseUrl, supabaseAnonKey, callback) {
    fetch(supabaseUrl + '/rest/v1/bots?select=primary_color&id=eq.' + encodeURIComponent(botId), {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': 'Bearer ' + supabaseAnonKey,
      }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var color = (data && data[0] && data[0].primary_color) ? data[0].primary_color : DEFAULT_COLOR;
        callback(color);
      })
      .catch(function () {
        callback(DEFAULT_COLOR);
      });
  }

  window.ChatbotWidget = {
    init: function (config) {
      if (!config.botId) {
        console.error('Chatbot widget: botId is required');
        return;
      }

      var botId = config.botId;
      var origin = config.origin || window.location.origin;

      if (config.primaryColor) {
        buildWidget(botId, origin, config.primaryColor);
        return;
      }

      if (config.supabaseUrl && config.supabaseAnonKey) {
        fetchBotColor(botId, config.supabaseUrl, config.supabaseAnonKey, function (color) {
          buildWidget(botId, origin, color);
        });
        return;
      }

      // Auto-fetch using built-in credentials
      fetchBotColor(botId, SUPABASE_URL, SUPABASE_ANON_KEY, function (color) {
        buildWidget(botId, origin, color);
      });
    }
  };
})();
