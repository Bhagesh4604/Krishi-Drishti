import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
model = genai.GenerativeModel("gemini-pro")
print("Model name:", model.model_name)

model2 = genai.GenerativeModel("gemini-1.0-pro")
print("Model2 name:", model2.model_name)
