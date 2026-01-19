from fastapi import FastAPI
from fastapi.responses import FileResponse
from transformers import AutoProcessor, BarkModel
from pydantic import BaseModel
import tempfile
import scipy.io.wavfile

app = FastAPI()

processor = AutoProcessor.from_pretrained("suno/bark")
model = BarkModel.from_pretrained("suno/bark", use_safetensors=False)
model.config.tie_word_embeddings = False

class TextRequest(BaseModel):
    txt : str
    voice : str = "v2/en_speaker_6"

@app.post("/speak/")
def speak(request : TextRequest):

    inputs = processor(request.txt, voice_preset=request.voice)
    audio_array = model.generate(**inputs)
    audio_array = audio_array.cpu().numpy().squeeze()
    sample_rate = model.generation_config.sample_rate

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    scipy.io.wavfile.write(tmp_file.name, sample_rate, audio_array)

    return FileResponse(tmp_file.name, media_type="audio/wav")
