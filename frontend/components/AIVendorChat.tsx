"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from "next/navigation";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  vendorSuggestions?: Array<{
    id: string;
    businessName: string;
    category: string;
    city: string;
    rating: number;
    packages?: Array<{
      name: string;
      price: number;
      description: string;
    }>;
  }>;
}

interface AIVendorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

function resolveApiBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  if (env) return env;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3002';
    const base = window.location.origin.replace(/\/$/, '');
    return `${base}/api`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
}

const API_BASE = resolveApiBaseUrl();

export default function AIVendorChat({ isOpen, onClose }: AIVendorChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI vendor assistant. You can say things like \"hi\", ask general questions, or tell me what kind of vendor you need (e.g. catering for 150 guests, equipment rental for a conference, photography for a wedding). I'll suggest vendors by type (catering, equipment, music & DJ, etc.) and help you request quotes. 🎉"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const lower = userMessage.content.trim().toLowerCase();
      const isVeryShort = lower.length <= 25;
      const isGreetingOrSmallTalk =
        /^(hi+|hello+|hey+|salam|assalam|assalamu|good (morning|evening|night))\b/.test(lower) ||
        (isVeryShort && (lower.includes("how are you") || lower.includes("how are u") || lower.includes("kese ho")));

      // greetings stay local — no API round-trip
      if (isGreetingOrSmallTalk) {
        const friendlyReply: Message = {
          role: 'assistant',
          content:
            "Hi there! 👋 I'm here to help with your event planning. You can ask me things like:\n\n• \"I need catering for 150 guests in a city\"\n• \"Find equipment rental vendors for a conference\"\n• \"Suggest photographers for a wedding or corporate event\"\n\nTell me what you're planning and I'll recommend suitable vendors by type."
        };
        setMessages(prev => [...prev, friendlyReply]);
        setLoading(false);
        return;
      }

      const vendorsResponse = await fetch(`${API_BASE}/vendors/marketplace?limit=200`, {
        credentials: 'include'
      });
      const raw = vendorsResponse.ok ? await vendorsResponse.json() : {};
      const vendors = Array.isArray(raw) ? raw : (raw.vendors || []);

      const response = await fetch(`${API_BASE}/ai/vendor-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          availableVendors: vendors
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || data.content || 'I understand your requirements. Let me help you find the perfect vendors!',
        vendorSuggestions: data.vendorSuggestions || data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to browse vendors manually using the search filters above."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Raleway, sans-serif' }}>
                AI Vendor Package Assistant
              </h2>
              <p className="text-sm text-blue-100" style={{ fontFamily: 'Inter, sans-serif' }}>
                Tell me about your event and I'll find the perfect vendors!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.vendorSuggestions && message.vendorSuggestions.length > 0 && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                      <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'Raleway, sans-serif' }}>
                        Recommended Vendors:
                      </p>
                      {message.vendorSuggestions.map((vendor, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-gray-900" style={{ fontFamily: 'Raleway, sans-serif' }}>
                                {vendor.businessName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {vendor.category}
                                </span>
                                <span className="text-xs text-gray-600">📍 {vendor.city}</span>
                                {vendor.rating > 0 && (
                                  <span className="text-xs text-gray-600">
                                    ⭐ {vendor.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const meRes = await fetch(`${API_BASE}/auth/me`, {
                                      credentials: "include",
                                    });
                                    if (meRes.ok) {
                                      router.push(`/quote-request/${vendor.id}`);
                                    } else {
                                      const returnUrl = encodeURIComponent(`/quote-request/${vendor.id}`);
                                      router.push(`/auth/login?returnUrl=${returnUrl}`);
                                    }
                                  } catch {
                                    const returnUrl = encodeURIComponent(`/quote-request/${vendor.id}`);
                                    router.push(`/auth/login?returnUrl=${returnUrl}`);
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                              >
                                Request Quote →
                              </button>
                              <a
                                href={`/vendor/${vendor.id}/public`}
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me about your event... (e.g., 'I need catering for a wedding with 200 guests, budget is $5000, in New York')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
              rows={2}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

