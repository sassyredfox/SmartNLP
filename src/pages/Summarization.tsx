import React, { useState } from "react";
import { FileText, Copy, Check, Upload } from "lucide-react";
import { useNLP } from "../contexts/NLPContext";
import LoadingSpinner from "../components/LoadingSpinner";

const Summarization: React.FC = () => {
  const { state, addToHistory, setLoading } = useNLP();

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [summaryLength, setSummaryLength] = useState("medium");
  const [copied, setCopied] = useState(false);

  const [mode, setMode] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);

  const lengthOptions = [
    { value: "short", label: "Short (2-4 sentences)" },
    { value: "medium", label: "Medium (7-9 sentences)" },
    { value: "long", label: "Long (12-16 sentences)" },
  ];

  /* =====================================================
     TEXT SUMMARIZATION
  ===================================================== */
  const summarizeText = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, length: summaryLength }),
      });

      const data = await response.json();
      setOutputText(data.summary);

      addToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "summarization",
        input: inputText,
        output: data.summary,
        metadata: { summaryLength },
      });
    } catch (err) {
      setOutputText("⚠️ Failed to generate summary. Please try again.");
    }
    setLoading(false);
  };

  /* =====================================================
     FILE SUMMARIZATION
  ===================================================== */
  const summarizeFile = async () => {
    if (!file) return alert("Please upload a file first.");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("length", summaryLength);

    try {
      const response = await fetch("http://127.0.0.1:8000/processFile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setOutputText(data.summary);

      addToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "summarization",
        input: file.name,
        output: data.summary,
        metadata: { summaryLength },
      });
    } catch (err) {
      setOutputText("⚠️ File could not be summarized.");
    }

    setLoading(false);
  };

  /* Copy output summary text */
  const copyToClipboard = async () => {
    if (!outputText) return;
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = inputText.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Heading */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
          Text Summarization
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Generate concise summaries from text or uploaded documents
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            setMode("text");
            setOutputText("");
            setFile(null);
          }}
          className={`px-4 py-2 rounded-lg ${
            mode === "text"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          }`}
        >
          Text Mode
        </button>

        <button
          onClick={() => {
            setMode("file");
            setOutputText("");
            setInputText("");
          }}
          className={`px-4 py-2 rounded-lg ${
            mode === "file"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          }`}
        >
          File Mode
        </button>
      </div>

      {/* Body Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">

        {/* Summary Length */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
          Summary Length
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {lengthOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                summaryLength === option.value
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600"
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={summaryLength === option.value}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label.split(" (")[0]}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ({option.label.split(" (")[1]}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* =========================================
           TEXT MODE INPUT
        ========================================== */}
        {mode === "text" && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Text to Summarize
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {wordCount} words, {charCount} characters
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type the text you want to summarize..."
              className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />

            <div className="flex justify-center mt-6">
              <button
                onClick={summarizeText}
                disabled={!inputText.trim() || wordCount < 10 || state.isLoading}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                {state.isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* =========================================
           FILE MODE INPUT
        ========================================== */}
        {mode === "file" && (
          <>
            <label className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors border-gray-400 bg-white dark:bg-gray-800">
              <Upload className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Click to upload PDF/Image
              </p>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {file && (
              <div className="text-center text-gray-700 dark:text-gray-300 mt-2">
                ✅ Selected: {file.name}
              </div>
            )}

            <div className="flex justify-center mt-6">
              <button
                onClick={summarizeFile}
                disabled={!file || state.isLoading}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                {state.isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Summarize File</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* =========================================
           ALWAYS VISIBLE OUTPUT (FOR BOTH MODES)
        ========================================== */}
        {(outputText || state.isLoading) && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Summary
              </h3>

              {outputText && (
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-all duration-200"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 min-h-24">
              {state.isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <LoadingSpinner />
                </div>
              ) : (
                <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                  {outputText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summarization;
