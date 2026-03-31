import signData from './Data/signData.js';

const chatWidget = document.getElementById('chatbotWidget');
const chatbotBody = document.getElementById('chatbotMessages');
const chatbotForm = document.getElementById('chatForm');
const chatbotInput = document.getElementById('chatInput');
const chatSendBtn = document.querySelector('.chatbot-send');
const chatbotCloseBtn = document.getElementById('chatbotCloseBtn');

const fallbackResponses = [
  "I couldn't find that sign yet. Try asking about common words like hello, thank you, yes, no, or I love you.",
  "Ask about a simple sign: 'sign for thank you', 'what is yes in ASL', or 'how to say hello'."
];

function getRandomFallbackResponse() {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

function matchesKeyword(prompt, keyword) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.includes(' ')) {
    return prompt.includes(normalizedKeyword);
  }

  const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i');
  return regex.test(prompt);
}

function openChatbot() {
  chatWidget.classList.add('open');
  chatWidget.setAttribute('aria-hidden', 'false');
  chatbotInput.focus();
}

function closeChatbot() {
  chatWidget.classList.remove('open');
  chatWidget.setAttribute('aria-hidden', 'true');
}

function scrollChatToBottom() {
  chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findBestMatch(prompt) {
  const normalizedPrompt = normalizeText(prompt);
  let bestMatch = null;
  let bestScore = 0;

  signData.forEach(sign => {
    let score = 0;

    sign.keywords.forEach(keyword => {
      if (!keyword) return;
      if (matchesKeyword(normalizedPrompt, keyword)) {
        score += normalizeText(keyword).split(' ').length * 3;
      }
    });

    const promptWords = normalizedPrompt.split(' ');
    promptWords.forEach(word => {
      if (!word) return;
      if (sign.keywords.some(keyword => matchesKeyword(word, keyword))) {
        score += 1;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = sign;
    }
  });

  return bestScore >= 3 ? bestMatch : null;
}

async function getSmartResponse(userText) {
  const match = findBestMatch(userText);

  if (match) {
    return {
      text: match.description || `Sign for "${match.word.replace(/_/g, ' ')}".`,
      media: match.image || null,
      label: match.image ? `Sign for "${match.word.replace(/_/g, ' ')}"` : ''
    };
  }

  return {
    text: getRandomFallbackResponse(),
    media: null,
    label: ''
  };
}

function createMessageBubble(content, sender) {
  const bubble = document.createElement('div');
  bubble.className = `chatbot-message ${sender}`;

  if (sender === 'user') {
    bubble.textContent = content.text;
    return bubble;
  }

  const textParagraph = document.createElement('p');
  textParagraph.textContent = content.text;
  bubble.appendChild(textParagraph);

  if (content.media) {
    const mediaImage = document.createElement('img');
    mediaImage.src = content.media;
    mediaImage.alt = 'Sign movement example';
    mediaImage.className = 'chat-media';

    if (content.fallbackImage) {
      mediaImage.onerror = () => {
        mediaImage.onerror = null;
        mediaImage.src = content.fallbackImage;
      };
    }

    mediaImage.onload = () => setTimeout(scrollChatToBottom, 20);
    bubble.appendChild(mediaImage);
  }

  if (content.label) {
    const label = document.createElement('div');
    label.className = 'chat-media-label';
    label.textContent = content.label;
    bubble.appendChild(label);
  }

  if (content.note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'chat-media-note';
    noteElement.textContent = content.note;
    bubble.appendChild(noteElement);
  }

  return bubble;
}

function addChatMessage(content, sender) {
  const bubble = createMessageBubble(content, sender);
  chatbotBody.appendChild(bubble);
  requestAnimationFrame(() => setTimeout(scrollChatToBottom, 50));
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `Typing<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  chatbotBody.appendChild(indicator);
  scrollChatToBottom();
  return indicator;
}

function removeTypingIndicator(indicator) {
  if (indicator && indicator.parentElement) {
    indicator.parentElement.removeChild(indicator);
  }
}

function getTypingDelay(text) {
  const base = 700;
  const lengthFactor = Math.min(900, text.length * 12);
  return base + lengthFactor;
}

async function handleUserInput(userText) {
  const indicator = showTypingIndicator();
  chatSendBtn.disabled = true;

  const delay = getTypingDelay(userText);
  await new Promise(resolve => setTimeout(resolve, delay));

  const response = await getSmartResponse(userText);
  removeTypingIndicator(indicator);
  addChatMessage(response, 'bot');
  chatSendBtn.disabled = false;
  chatbotInput.focus();
}

async function handleSendChat(event) {
  event.preventDefault();
  const userText = chatbotInput.value.trim();
  if (!userText) return;

  addChatMessage({ text: userText }, 'user');
  chatbotInput.value = '';

  await handleUserInput(userText);
}

chatbotForm.addEventListener('submit', handleSendChat);
chatbotCloseBtn.addEventListener('click', closeChatbot);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeChatbot();
});

window.openChatbot = openChatbot;
window.closeChatbot = closeChatbot;
window.getSmartResponse = getSmartResponse;
window.findBestMatch = findBestMatch;
