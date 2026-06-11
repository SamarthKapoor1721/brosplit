"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export interface UseVoiceOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  lang?: string;
  continuous?: boolean;
}

export function useVoice({
  onResult,
  lang = "en-IN",
  continuous = false,
}: UseVoiceOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);

    const rec = new Ctor() as {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult?: (e: SpeechRecognitionEventLike) => void;
      onerror?: (e: { error?: string }) => void;
      onend?: () => void;
    };
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript;
        if (res.isFinal) finalText += text;
        else interimText += text;
      }
      const full = (finalText + " " + interimText).trim();
      setTranscript(full);
      if (onResult) onResult(full, !!finalText);
    };
    rec.onerror = (e) => {
      setError(e.error || "Speech error");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
  }, [lang, continuous, onResult]);

  const start = useCallback(() => {
    setError(null);
    setTranscript("");
    const rec = recognitionRef.current as { start: () => void } | null;
    if (!rec) return;
    try {
      rec.start();
      setListening(true);
    } catch {
      // already running
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current as { stop: () => void } | null;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
