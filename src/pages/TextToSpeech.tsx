import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Copy, Check } from "lucide-react";
import { useNLP } from "../contexts/NLPContext";

interface VoiceOption {
  label: string;
  value: string;
}

const TextToSpeech: React.FC = () => {
  const { addToHistory } = useNLP();

  // ---------- STATE ---------- //
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("en-US-Wavenet-D");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voices: VoiceOption[] = [
    { label: "Male US 1", value: "en-US-Wavenet-D" },
    { label: "Female US 1", value: "en-US-Wavenet-C" },
    { label: "Female British", value: "en-GB-Wavenet-A" },
  ];

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  // ---------- TEXT → SPEECH ---------- //
  const handleSpeak = async () => {
    if (!inputText.trim()) return;
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/textToSpeech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          voice_name: selectedVoice,
          language_code: "en-US",
        }),
      });

      if (!response.ok) throw new Error("Backend error");
      const data = await response.json();

      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );

      const url = URL.createObjectURL(audioBlob);
      setAudioSrc(url);

      setTimeout(() => {
        audioRef.current?.play();
        setIsPlaying(true);
        setIsPaused(false);

        addToHistory({
          type: "text-to-speech",
          input: inputText,
          output: "Audio generated",
          metadata: { voice: selectedVoice },
        });
      }, 120);
    } catch (err) {
      console.error("TTS Error:", err);
    }
    setLoading(false);
  };

  // ---------- FILE → SPEECH ---------- //
  const handleFileToSpeech = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("voice_name", selectedVoice);
    formData.append("language_code", "en-US");

    try {
      const response = await fetch("http://127.0.0.1:8000/fileToSpeech", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setInputText(data.extractedText);

      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );

      const url = URL.createObjectURL(audioBlob);
      setAudioSrc(url);

      addToHistory({
        type: "text-to-speech",
        input: file.name,
        output: "Audio generated from file",
        metadata: { voice: selectedVoice },
      });

      setTimeout(() => {
        audioRef.current?.play();
        setIsPlaying(true);
        setIsPaused(false);
      }, 120);
    } catch (err) {
      console.error("File → Speech Error:", err);
    }
    setLoading(false);
  };

  // ---------- AUDIO CONTROLS ---------- //
  const pauseAudio = () => {
    audioRef.current?.pause();
    setIsPaused(true);
  };

  const resumeAudio = () => {
    audioRef.current?.play();
    setIsPaused(false);
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;
    setIsPlaying(false);
    setIsPaused(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    audioRef.current?.addEventListener("ended", () => {
      setIsPlaying(false);
      setIsPaused(false);
    });
  }, [audioSrc]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Text to Speech
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Transform text or documents into natural-sounding speech
        </p>
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border">
        {/* ---------- TEXT INPUT ---------- */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Text to Convert</h3>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {wordCount} words, {charCount} characters
              </span>

              {inputText && (
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to convert..."
            className="w-full p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* ---------- FILE UPLOAD (Styled Like Theme) ---------- */}
        <label
          htmlFor="fileInput"
          className="w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-50 dark:bg-gray-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-gray-600"
        >
          <span className="text-gray-600 dark:text-gray-300 mb-2">
            Drag & Drop or Click to Upload PDF / Image
          </span>

          <button className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all">
            Choose File
          </button>
        </label>

        <input
          id="fileInput"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {file && (
          <div className="mt-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <strong>Selected:</strong> {file.name}
          </div>
        )}

        {/* ---------- VOICE + PLAYBACK ---------- */}
        <div className="mb-6 flex items-center space-x-4 mt-2">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Select Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
            >
              {voices.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center space-y-6 mt-4">
            {!isPlaying ? (
              <button
                onClick={file ? handleFileToSpeech : handleSpeak}
                disabled={(!inputText.trim() && !file) || loading}
                className="px-20 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg"
              >
                <Play className="w-6 h-6 ml-1" />
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={isPaused ? resumeAudio : pauseAudio}
                  className="px-9 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg"
                >
                  {isPaused ? <Play /> : <Pause />}
                </button>
                <button onClick={stopAudio} className="px-9 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg">
                  <Square />
                </button>
              </div>
            )}

            {audioSrc && <audio ref={audioRef} src={audioSrc} />}
          </div>
        </div>

        {/* ---------- TIPS SECTION ---------- */}
        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">Tips</h4>
          <ul className="text-sm text-orange-800 dark:text-orange-400 space-y-1">
            <li>• Use punctuation for natural pauses</li>
            <li>• Try different voice tones</li>
            <li>• Large files take longer</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;
