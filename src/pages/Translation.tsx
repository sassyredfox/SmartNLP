import React, { useState } from "react";
import {
  ArrowLeftRight,
  Copy,
  ClipboardCheck,
  Volume,
  VolumeX,
} from "lucide-react";
import { useNLP } from "../contexts/NLPContext";
import LoadingSpinner from "../components/LoadingSpinner";

const Translation: React.FC = () => {
  const { state, addToHistory, setLoading } = useNLP();

  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const languageOptions = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
  ];

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      });

      if (!res.ok) throw new Error(`API request failed: ${res.status}`);
      const data = await res.json();
      setTranslatedText(data.translation);

      addToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "translation",
        input: sourceText,
        output: data.translation,
        metadata: {
          fromLang: languageOptions.find((l) => l.code === sourceLang)?.name,
          toLang: languageOptions.find((l) => l.code === targetLang)?.name,
        },
      });
    } catch (err) {
      console.error("Translation error:", err);
      setTranslatedText("⚠️ Unable to translate. Please try again.");
    }
    setLoading(false);
  };

  /** ✅ Updated: Send BOTH file + target_lang inside FormData */
  const handleFileUpload = async () => {
    if (!file) return alert("Please select or drop a file first!");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_lang", targetLang); // ✅ Now backend receives this correctly

    try {
      const res = await fetch("http://localhost:8000/processFile", {
        method: "POST",
        body: formData, // 💡 Do NOT add headers, browser handles that automatically
      });

      const data = await res.json();
      const output = data.translation || data.summary || "⚠️ No output";
      setTranslatedText(output);

      addToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "summarization",
        input: file.name,
        output: output,
        metadata: {
          toLang: languageOptions.find((l) => l.code === targetLang)?.name,
          summaryLength: data.summary?.length,
        },
      });
    } catch (err) {
      console.error("File processing error:", err);
      setTranslatedText("⚠️ Unable to process file.");
    }
    setLoading(false);
  };

  const speakOut = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const switchMode = (newMode: "text" | "file") => {
    setMode(newMode);
    setTranslatedText(""); // ✅ clears output
    setSourceText("");
    setFile(null);
  };

  const renderLangSelect = (value: string, onChange: (val: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      {languageOptions.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Text & File Translation
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Translate text, PDFs, and Images
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => switchMode("text")}
          className={`px-4 py-2 rounded-lg ${mode === "text"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            }`}
        >
          Text Mode
        </button>
        <button
          onClick={() => switchMode("file")}
          className={`px-4 py-2 rounded-lg ${mode === "file"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            }`}
        >
          File Mode
        </button>
      </div>

      {/* TEXT MODE */}
      {mode === "text" && (
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-center space-x-4 mb-6">
            {renderLangSelect(sourceLang, setSourceLang)}
            <button
              onClick={swapLanguages}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
            {renderLangSelect(targetLang, setTargetLang)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-40 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700"
            />

            <div>
              <textarea
                value={translatedText}
                readOnly
                placeholder="Translation will appear here..."
                className="w-full h-40 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700"
              />

              {translatedText && (
                <div className="flex space-x-2 mt-2 justify-end">
                  <button
                    onClick={() => speakOut(translatedText)}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    <Volume className="w-3 h-3" />
                    <span>Speak</span>
                  </button>

                  <button
                    onClick={stopSpeaking}
                    className="flex items-center space-x-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    <VolumeX className="w-3 h-3" />
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(translatedText)}
                    className="flex items-center space-x-1 px-2 py-1 bg-gray-300 dark:bg-gray-600 text-xs rounded hover:bg-gray-400"
                  >
                    {copied ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={handleTranslate}
              disabled={!sourceText.trim() || state.isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg"
            >
              {state.isLoading ? <LoadingSpinner /> : "Translate"}
            </button>
          </div>
        </div>
      )}

      {/* FILE MODE */}
      {mode === "file" && (
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 space-y-4">

          <div className="flex items-center justify-center space-x-4 mb-4">
            <select disabled className="px-4 py-2 border rounded-lg bg-gray-300 dark:bg-gray-600 text-white cursor-not-allowed">
              <option>Auto-detect</option>
            </select>

            <button
              onClick={swapLanguages}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>

            {renderLangSelect(targetLang, setTargetLang)}
          </div>

          <label
            htmlFor="fileInput"
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
            className={`w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-gray-700"
                : "border-gray-400 bg-white dark:bg-gray-800"
            }`}
          >
            {file ? (
              <div className="flex items-center space-x-4">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-20 h-20 object-cover rounded-lg shadow"
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-red-100 dark:bg-red-700 text-red-600 dark:text-red-200 rounded-lg shadow text-3xl">
                    📄
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button onClick={() => setFile(null)} className="text-red-500 text-xl font-bold">
                  ❌
                </button>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">
                Click or Drag & Drop your PDF/Image
              </p>
            )}
            <input id="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <button
            onClick={handleFileUpload}
            disabled={!file || state.isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-lg"
          >
            {state.isLoading ? <LoadingSpinner /> : "Process File"}
          </button>

          {translatedText && (
            <div className="p-4 border rounded bg-gray-50 dark:bg-gray-700">
              <h3 className="font-bold mb-2">Result:</h3>
              <p className="whitespace-pre-wrap">{translatedText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Translation;
