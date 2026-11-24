"use client";

import { useEffect, useRef, useState } from "react";

export type DictationLanguage = "en-US" | "en-PK" | "ur-PK";

type Recognition = {
  processLocally: boolean; lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void; abort(): void;
};
type PackOptions = { langs: string[]; processLocally: true };
type LocalEngine = {
  new(): Recognition;
  available?(options: PackOptions): Promise<string>;
  install?(options: PackOptions): Promise<boolean>;
};
type VoiceWindow = Window & { SpeechRecognition?: LocalEngine; webkitSpeechRecognition?: LocalEngine };
type VoiceDocument = Document & { featurePolicy?: { allowsFeature(feature: string): boolean } };

function speechEngine() {
  const scope = window as VoiceWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export function useLocalVoice() {
  const [state, setState] = useState<"idle" | "checking" | "listening" | "speaking">("idle");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceReload, setVoiceReload] = useState(false);
  const [installLanguage, setInstallLanguage] = useState<DictationLanguage | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epoch = useRef(0);
  useEffect(() => () => {
    epoch.current++;
    if (deadline.current) clearTimeout(deadline.current);
    recognition.current?.abort();
    recognition.current = null;
    if (speech.current) window.speechSynthesis.cancel();
    speech.current = null;
  }, []);

  function stopVoice() {
    epoch.current++;
    if (deadline.current) clearTimeout(deadline.current);
    recognition.current?.abort();
    recognition.current = null;
    if (speech.current) window.speechSynthesis.cancel();
    speech.current = null;
    setInstallLanguage(null);
    setState("idle");
  }

  function timeoutVoice(ticket: number, duration: number, message: string) {
    if (deadline.current) clearTimeout(deadline.current);
    deadline.current = setTimeout(() => {
      if (ticket !== epoch.current) return;
      stopVoice();
      setVoiceNotice(message);
    }, duration);
  }

  async function installVoicePack() {
    const Engine = speechEngine();
    if (!installLanguage || !Engine?.install) return;
    const language = installLanguage;
    const ticket = ++epoch.current;
    setInstallLanguage(null);
    setState("checking");
    setVoiceNotice("");
    timeoutVoice(ticket, 45_000, "The language pack is taking longer than expected. Check browser settings or type your message.");
    try {
      const installed = await Engine.install({ langs: [language], processLocally: true });
      if (ticket !== epoch.current) return;
      stopVoice();
      setVoiceNotice(installed ? "Language pack ready. Select Dictate to start." : "This browser could not install the language pack. You can still type.");
    } catch {
      if (ticket !== epoch.current) return;
      stopVoice();
      setVoiceNotice("The browser blocked the language pack download. You can still type.");
    }
  }

  async function dictate(language: DictationLanguage, onText: (text: string) => void) {
    stopVoice();
    setVoiceNotice("");
    setVoiceReload(false);
    const Engine = speechEngine();
    if (!Engine?.available) { setVoiceNotice("This browser does not offer on-device dictation. You can still type your message."); return; }
    if ((document as VoiceDocument).featurePolicy?.allowsFeature("microphone") === false) {
      setVoiceReload(true);
      setVoiceNotice("Open the atelier directly to enable its microphone policy. You can also type your message.");
      return;
    }
    const ticket = epoch.current;
    setState("checking");
    timeoutVoice(ticket, 12_000, "Dictation could not start. Check your microphone and browser permissions or type instead.");
    try {
      const available = await Engine.available({ langs: [language], processLocally: true });
      if (ticket !== epoch.current) return;
      if (available !== "available") {
        stopVoice();
        if (available === "downloadable" && Engine.install) {
          setInstallLanguage(language);
          setVoiceNotice("This language needs an on-device browser pack. Install it or type your message.");
        } else {
          setVoiceNotice(available === "downloading" ? "The selected language pack is downloading. Try again later." : "The selected language is unavailable for on-device dictation. You can still type.");
        }
        return;
      }
      const mic = new Engine();
      if (!("processLocally" in mic)) throw new Error("Unsupported");
      mic.processLocally = true;
      mic.lang = language;
      mic.continuous = false;
      mic.interimResults = false;
      mic.onstart = () => {
        if (ticket !== epoch.current) return;
        setState("listening");
        timeoutVoice(ticket, 35_000, "No dictation was added. Try again or type your message.");
      };
      mic.onresult = (event) => {
        if (ticket !== epoch.current) return;
        const text = event.results[0]?.[0]?.transcript?.trim();
        if (text) { onText(text); setVoiceNotice("Dictation added to your message. Review it before sending."); }
      };
      mic.onerror = (event) => {
        if (ticket !== epoch.current) return;
        stopVoice();
        setVoiceNotice(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Microphone access was denied or the local speech service is unavailable. Check browser permissions, then try again." : "Dictation could not capture speech. Check the microphone or type instead.");
      };
      mic.onend = () => {
        if (ticket !== epoch.current) return;
        recognition.current = null;
        stopVoice();
      };
      recognition.current = mic;
      mic.start();
    } catch {
      if (ticket === epoch.current) { stopVoice(); setVoiceNotice("On-device dictation could not start. Check microphone permissions or type instead."); }
    }
  }

  function readAloud(text: string, preferredLanguage: DictationLanguage) {
    stopVoice();
    setVoiceNotice("");
    setVoiceReload(false);
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { setVoiceNotice("This browser cannot read responses aloud."); return; }
    const language = /[\u0600-\u06ff]/.test(text) ? "ur" : "en";
    const voices = window.speechSynthesis.getVoices().filter((item) => item.localService && item.lang.toLowerCase().split(/[-_]/)[0] === language);
    const voice = voices.find((item) => item.lang.toLowerCase() === preferredLanguage.toLowerCase()) ?? voices[0];
    if (!voice) { setVoiceNotice(`No local ${language === "ur" ? "Urdu" : "English"} voice is available yet. Check your device’s speech settings or try again.`); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`|]/g, " ").slice(0, 4000));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const ticket = epoch.current;
    setState("checking");
    timeoutVoice(ticket, 12_000, "The local voice did not start. Try again.");
    utterance.onstart = () => {
      if (ticket !== epoch.current) return;
      if (deadline.current) clearTimeout(deadline.current);
      setState("speaking");
    };
    utterance.onend = () => {
      if (ticket !== epoch.current) return;
      speech.current = null;
      stopVoice();
    };
    utterance.onerror = () => {
      if (ticket !== epoch.current) return;
      stopVoice(); setVoiceNotice("The local voice could not read this reply. Try again.");
    };
    speech.current = utterance;
    try { window.speechSynthesis.speak(utterance); }
    catch { stopVoice(); setVoiceNotice("This device could not start local playback."); }
  }
  return { state, voiceNotice, voiceReload, dictate, stopVoice, readAloud, installLanguage, installVoicePack };
}
