"use client";

import { useEffect, useRef, useState } from "react";

export type DictationLanguage = "en-US" | "en-PK" | "ur-PK";

type Recognition = {
  processLocally: boolean; lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void; stop(): void; abort(): void;
};
type LocalEngine = {
  new(): Recognition;
  available?(options: { langs: string[]; processLocally: true }): Promise<string>;
};
type VoiceWindow = Window & { SpeechRecognition?: LocalEngine; webkitSpeechRecognition?: LocalEngine };
type VoiceDocument = Document & { featurePolicy?: { allowsFeature(feature: string): boolean } };

export function useLocalVoice() {
  const [state, setState] = useState<"idle" | "checking" | "listening" | "speaking">("idle");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceReload, setVoiceReload] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const epoch = useRef(0);
  useEffect(() => () => {
    epoch.current++;
    recognition.current?.abort();
    recognition.current = null;
    if (speech.current) window.speechSynthesis.cancel();
    speech.current = null;
  }, []);

  function stopVoice() {
    epoch.current++;
    recognition.current?.abort();
    recognition.current = null;
    if (speech.current) window.speechSynthesis.cancel();
    speech.current = null;
    setState("idle");
  }

  async function dictate(language: DictationLanguage, onText: (text: string) => void) {
    stopVoice();
    setVoiceNotice("");
    setVoiceReload(false);
    const scope = window as VoiceWindow;
    const Engine = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Engine?.available) { setVoiceNotice("This browser does not offer on-device dictation. You can still type your message."); return; }
    if ((document as VoiceDocument).featurePolicy?.allowsFeature("microphone") === false) {
      setVoiceReload(true);
      setVoiceNotice("Open the atelier directly to enable its microphone policy. You can also type your message.");
      return;
    }
    const ticket = epoch.current;
    setState("checking");
    try {
      const available = await Engine.available({ langs: [language], processLocally: true });
      if (ticket !== epoch.current) return;
      if (available !== "available") {
        setState("idle");
        setVoiceNotice("The selected language is unavailable for on-device dictation. Install its language pack in your browser or type instead.");
        return;
      }
      const mic = new Engine();
      if (!("processLocally" in mic)) throw new Error("Unsupported");
      mic.processLocally = true;
      mic.lang = language;
      mic.continuous = false;
      mic.interimResults = false;
      mic.onstart = () => { if (ticket === epoch.current) setState("listening"); };
      mic.onresult = (event) => {
        if (ticket !== epoch.current) return;
        const text = event.results[0]?.[0]?.transcript?.trim();
        if (text) { onText(text); setVoiceNotice("Dictation added to your message. Review it before sending."); }
      };
      mic.onerror = (event) => {
        if (ticket !== epoch.current) return;
        setVoiceNotice(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Microphone access was denied or the local speech service is unavailable. Check browser permissions, then try again." : "Dictation could not capture speech. Check the microphone or type instead.");
        setState("idle");
      };
      mic.onend = () => { if (ticket === epoch.current) { recognition.current = null; setState("idle"); } };
      recognition.current = mic;
      mic.start();
    } catch {
      if (ticket === epoch.current) { stopVoice(); setVoiceNotice("On-device dictation could not start. Check microphone permissions or type instead."); }
    }
  }

  function readAloud(text: string) {
    stopVoice();
    setVoiceNotice("");
    setVoiceReload(false);
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { setVoiceNotice("This browser cannot read responses aloud."); return; }
    const language = /[\u0600-\u06ff]/.test(text) ? "ur" : "en";
    const voice = window.speechSynthesis.getVoices().find((item) => item.localService && item.lang.toLowerCase().split(/[-_]/)[0] === language);
    if (!voice) { setVoiceNotice(`No local ${language === "ur" ? "Urdu" : "English"} voice is available on this device.`); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`|]/g, " ").slice(0, 4000));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const ticket = epoch.current;
    utterance.onstart = () => { if (ticket === epoch.current) setState("speaking"); };
    utterance.onend = () => { if (ticket === epoch.current) { speech.current = null; setState("idle"); } };
    utterance.onerror = () => { if (ticket === epoch.current) { stopVoice(); setVoiceNotice("The local voice could not read this reply. Try again."); } };
    speech.current = utterance;
    window.speechSynthesis.speak(utterance);
  }
  return { state, voiceNotice, voiceReload, dictate, stopVoice, readAloud };
}
