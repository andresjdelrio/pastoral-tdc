import React, { useState, useEffect, useRef } from 'react';
import { Heart, Send, Sparkles, MessageCircle, Clock, User, Bot } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load suggested questions
    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/chat/suggestions');
        const data = await response.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    loadSuggestions();

    // Add welcome message
    setMessages([{
      id: '1',
      type: 'assistant',
      content: '¡Hola! Soy el asistente de análisis de datos de la Pastoral Finis Terrae. Puedes preguntarme sobre actividades, indicadores, tendencias, y cualquier información de los datos. ¿En qué te puedo ayudar?',
      timestamp: new Date()
    }]);
  }, []);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          confidence: data.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.detail || 'Error al procesar la pregunta');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu pregunta. Por favor intenta de nuevo.',
        timestamp: new Date(),
        confidence: 0
      };

      setMessages(prev => [...prev, errorMessage]);
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header with logo and brand colors */}
      <div className="w-full">
        {/* Top red strip */}
        <div className="w-full h-1 bg-brand-red"></div>

        {/* Logo section */}
        <div className="py-6 bg-white">
          <img
            src="/assets/logo-finis.png"
            alt="Finis Terrae"
            className="h-12 mx-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = document.createElement('div');
              placeholder.className = 'h-12 w-32 mx-auto bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 font-medium';
              placeholder.textContent = 'LOGO FINIS TERRAE';
              e.currentTarget.parentNode?.appendChild(placeholder);
            }}
          />
        </div>

        {/* Title banner */}
        <div className="w-full bg-brand-teal text-white py-3 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            ASISTENTE DE ANÁLISIS DE DATOS | PASTORAL FINIS
            <Sparkles className="h-5 w-5" />
          </h1>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        {/* Welcome header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-teal rounded-full mb-3">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-brand-text mb-2">
            Pregunta sobre tus datos
          </h2>
          <p className="text-gray-600">
            Analiza actividades, tendencias, audiencias y métricas con inteligencia artificial
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '60vh' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-brand-teal text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-xs opacity-75">
                      {message.type === 'user' ? 'Tú' : 'Asistente'}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  {message.confidence && (
                    <div className="text-xs opacity-60 mt-2">
                      Confianza: {Math.round(message.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions (only shown when no user messages) */}
          {messages.length === 1 && suggestions.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-3">Preguntas sugeridas:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregunta sobre tus datos..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-brand-teal text-white rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <Heart className="h-3 w-3" />
            Desarrollado con cariño para la Pastoral Finis Terrae
            <Heart className="h-3 w-3" />
          </p>
        </div>
      </div>
    </div>
  );
}