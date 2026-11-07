import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveAssistantProps {
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const sessionRef = useRef<any>(null);

  const startLiveSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setMessages([{ role: 'model', text: 'Live Session Connected. How can I help with your styling?' }]);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
               const text = message.serverContent.modelTurn.parts.map(p => p.text).join('');
               if (text) {
                 setMessages(prev => [...prev, { role: 'model', text }]);
               }
            }
          },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: "You are the Wardrobe Studio AI Assistant. You help users style 3D fabrics, recommend lighting setups, and control the virtual environment.",
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Error connecting: ' + err.message }]);
    }
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    setIsActive(false);
  };

  const sendMessage = async () => {
    if (!inputText || !sessionRef.current) return;
    setMessages(prev => [...prev, { role: 'user', text: inputText }]);
    sessionRef.current.then((session: any) => 
        session.sendRealtimeInput({ text: inputText })
    );
    setInputText('');
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 w-96 bg-[#0d0d0d] rounded-3xl border border-white/20 p-6 flex flex-col gap-4 z-50 shadow-2xl">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-sparkles text-blue-400"></i> Studio Assistant
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
      </div>

      <div className="h-64 overflow-y-auto flex flex-col gap-3 scrollbar-none">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-2xl text-[10px] ${msg.role === 'user' ? 'bg-white/10 text-white self-end ml-8' : 'bg-blue-500/10 text-white/80 self-start mr-8'}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask for style tips..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 text-[10px] text-white outline-none"
        />
        <button onClick={sendMessage} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center"><i className="fa-solid fa-paper-plane text-[10px]"></i></button>
        <button onClick={isActive ? stopLiveSession : startLiveSession} className={`w-8 h-8 rounded-full ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/40 hover:text-white'} flex items-center justify-center`}>
          <i className={`fa-solid ${isActive ? 'fa-stop' : 'fa-microphone'} text-[10px]`}></i>
        </button>
      </div>
    </div>
  );
};
