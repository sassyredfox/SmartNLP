from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import base64
from google.cloud import texttospeech, speech
import fitz  # PDF - PyMuPDF
from PIL import Image
import pytesseract
import io

# ============================================================
# CONFIGURATION - API CALL __ DEEPSEEK _ GCLOUD
# ============================================================

OPENROUTER_API_KEY = "API_KEY"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json"
}

SERVICE_ACCOUNT_FILE = r"C:\Study material\NLP-app\project\teak-medium-472300-f3-876caacb8a7a.json"
tts_client = texttospeech.TextToSpeechClient.from_service_account_file(SERVICE_ACCOUNT_FILE)
stt_client = speech.SpeechClient.from_service_account_file(SERVICE_ACCOUNT_FILE)


# ============================================================
# FASTAPI INIT
# ============================================================

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODELS
# ============================================================

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class SummarizeRequest(BaseModel):
    text: str
    length: str = "medium"
    mode: str = "normal"

class TTSRequest(BaseModel):
    text: str
    voice_name: str
    language_code: str


# ============================================================
# HELPERS
# ============================================================

def call_openrouter(prompt: str) -> str:
    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1500,
    }

    print("\n📡 Sending request to OpenRouter:", payload)
    response = requests.post(OPENROUTER_URL, headers=OPENROUTER_HEADERS, json=payload)
    print("🔍 Response:", response.text)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=response.text)

    return response.json()["choices"][0]["message"]["content"].strip()


def extract_text_from_file(file: UploadFile) -> str:
    file_bytes = file.file.read()

    if file.filename.lower().endswith(".pdf"):
        print("📄 Extracting text from PDF...")
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return " ".join([page.get_text() for page in doc])

    if file.content_type.startswith("image/"):
        print("🖼 Extracting text from Image...")
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img)

    raise HTTPException(status_code=400, detail="Unsupported file type")


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def root():
    return {"message": "✅ NLP backend running"}


# ---------------- TRANSLATION ---------------------------
@app.post("/translate")
def translate(req: TranslationRequest):
    prompt = f"Translate from {req.source_lang} to {req.target_lang}:\n{req.text}"
    translated = call_openrouter(prompt)
    return {"translation": translated}


# ---------------- SUMMARIZATION -------------------------
@app.post("/summarize")
def summarize(req: SummarizeRequest):

    if req.mode == "bullet":
        prompt = f"Summarize into bullet points:\n{req.text}"
    else:
        prompt = {
            "short": "Summarize in 2-4 sentences.",
            "medium": "Summarize in 6-9 sentences.",
            "long": "Summarize in 12-16 sentences.",
        }[req.length] + f"\nText:\n{req.text}"

    result = call_openrouter(prompt)
    return {"summary": result}


# ---------------- FILE → SUMMARIZATION ------------------
@app.post("/processFile")
async def process_file(
    file: UploadFile = File(...),
    summary_length: str = Form("medium"),
    summary_mode: str = Form("normal"),
    target_lang: str = Form("")
):
    extracted_text = extract_text_from_file(file)

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Unable to extract readable text")

    detect_prompt = f"Detect language ISO code. Example: en, es, fr, hi.\n{extracted_text[:300]}"
    detected = call_openrouter(detect_prompt)

    summary_output = summarize(
        SummarizeRequest(text=extracted_text, length=summary_length, mode=summary_mode)
    )["summary"]

    translation_output = None
    if target_lang.strip():
        translation_output = translate(
            TranslationRequest(text=summary_output, source_lang=detected, target_lang=target_lang)
        )["translation"]

    return {"summary": summary_output, "translation": translation_output, "detected_language": detected}


# ---------------- TEXT → SPEECH (FIXED) ------------------
@app.post("/textToSpeech")
def text_to_speech(req: TTSRequest):
    synthesis_input = texttospeech.SynthesisInput(text=req.text)
    voice = texttospeech.VoiceSelectionParams(language_code=req.language_code, name=req.voice_name)
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)

    return {"audioContent": base64.b64encode(response.audio_content).decode("utf-8")}


# ---------------- FILE → SPEECH --------------------------
@app.post("/fileToSpeech")
async def file_to_speech(
    file: UploadFile = File(...),
    voice_name: str = Form(...),
    language_code: str = Form(...)
):
    extracted_text = extract_text_from_file(file)

    synthesis_input = texttospeech.SynthesisInput(text=extracted_text[:5000])
    voice = texttospeech.VoiceSelectionParams(language_code=language_code, name=voice_name)
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)

    return {"audioContent": base64.b64encode(response.audio_content).decode("utf-8"), "extractedText": extracted_text}


# Debug route listing
print("\n✅ Loaded Routes:")
for route in app.routes:
    print(route.path)
