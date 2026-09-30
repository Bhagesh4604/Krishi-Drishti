import sys, os, io, warnings
sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings('ignore')
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path('C:/Users/bhage/Desktop/Krishi-Drishti/.env'))
load_dotenv(Path('C:/Users/bhage/Desktop/Krishi-Drishti/.env.local'))
from google import genai
from google.genai import types
from PIL import Image

key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=key)
print("Key prefix:", key[:10])

img_path = next(Path('research_eval/test_images/healthy').glob('*.jpg'))
with Image.open(img_path) as img:
    img = img.convert('RGB').resize((224, 224))
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=70)
    img_bytes = buf.getvalue()

models_to_try = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
    'gemini-pro-latest',
]

for model in models_to_try:
    try:
        print(f"\nTrying: {model}")
        resp = client.models.generate_content(
            model=model,
            contents=[types.Content(role='user', parts=[
                types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg'),
                types.Part.from_text(text='Is this leaf healthy? Reply: yes or no'),
            ])],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=20)
        )
        text = resp.text
        print(f"  resp.text = {text}")
        if resp.candidates:
            c = resp.candidates[0]
            print(f"  finish_reason = {c.finish_reason}")
            for p in c.content.parts:
                pt = getattr(p, 'text', None)
                print(f"  part.text = {pt}")
        print(f"  --> SUCCESS with {model}!")
        break
    except Exception as e:
        print(f"  FAILED: {str(e)[:150]}")
