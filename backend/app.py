# backend/app.py
import os
import time
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
from werkzeug.utils import secure_filename
import json
# Metrics and comparison imports
import Levenshtein
import string


# Image processing and OCR imports
import cv2
import numpy as np
import easyocr
from pdf2image import convert_from_path
from PIL import Image # Used by pdf2image to return images

import fitz # PyMuPDF for PDF handling (used in is_digital_pdf and extract_text_from_pdf)
# Database imports
from pymongo import MongoClient
from bson.objectid import ObjectId

# Firebase Admin SDK imports
import firebase_admin
from firebase_admin import credentials, auth

from openai import OpenAI # For LLM post-processing
from keybert import KeyBERT # For keyword extraction

# New import for YouTube Data API
from googleapiclient.discovery import build

# New imports for RAG (LangChain, ChromaDB, Sentence Transformers)
from langchain.text_splitter import RecursiveCharacterTextSplitter # <--- CORRECTED: This is the correct import path
from langchain.schema import Document

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings as SentenceTransformerEmbeddings


# --- Load Environment Variables ---
# This must be at the very top to ensure env vars are loaded before app initialization needs them
load_dotenv()
print("Environment variables loaded. FLASK_ENV is:", os.getenv("FLASK_ENV"))

# --- Flask App Initialization ---
app = Flask(__name__)

# Enable CORS for all origins during development.
# In production, restrict this to your frontend's domain for security.
CORS(app)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_super_secret_key_for_dev') # Add a secret key for session management (Flask security)


# --- Ground Truth Folder Configuration ---
GROUND_TRUTH_FOLDER = os.path.join(app.root_path, 'Ground_Truth')
if not os.path.exists(GROUND_TRUTH_FOLDER):
    print("Warning: Ground truth folder not found. Evaluation metrics will be skipped.")

# --- Results Folder Configuration (NEW) ---
RESULTS_FOLDER = os.path.join(app.root_path, 'Evaluation_Results')
if not os.path.exists(RESULTS_FOLDER):
    os.makedirs(RESULTS_FOLDER)
    print("Created results folder at: " + RESULTS_FOLDER)



# --- Upload Folder Configuration ---
# Define an absolute path to store uploaded notes
UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER) # Create the uploads directory if it doesn't exist
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # Limit uploads to 16MB (e.g., for large PDFs)

# --- OCR Reader Initialization (EasyOCR) ---
# Initialize EasyOCR reader once globally for efficiency
# It downloads models the first time it's run, might take a while.
# Use gpu=True if you have an NVIDIA GPU and CUDA/cuDNN set up, otherwise gpu=False.
try:
    reader = easyocr.Reader(['en', 'hi'], gpu=True) # Example languages: English and Hindi
    print("EasyOCR reader initialized successfully (GPU enabled).")
except Exception as e:
    print(f"Error initializing EasyOCR reader with GPU: {e}")
    print("Falling back to CPU mode for EasyOCR.")
    reader = easyocr.Reader(['en', 'hi'], gpu=False) # Fallback to CPU mode
    print("EasyOCR reader initialized successfully (CPU mode).")

# --- MongoDB Connection ---
mongo_uri = os.getenv("MONGO_URI")
mongo_db_name = os.getenv("MONGO_DB_NAME", "NoteVerseDB") # Default name if not in .env

mongo_client = None
db = None
if not mongo_uri:
    print("Error: MONGO_URI is not set in .env. MongoDB connection will not be established.")
else:
    try:
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client[mongo_db_name]
        # The ping command is cheap and does not require auth.
        # It's a good way to check if the server is alive.
        mongo_client.admin.command('ping')
        print(f"MongoDB connected to database: '{mongo_db_name}'")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        print("Please check your MONGO_URI and network access settings.")
        mongo_client = None
        db = None


# --- OpenAI Client Initialization ---
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = None
if not openai_api_key:
    print("Warning: OPENAI_API_KEY is not set in .env. LLM post-processing will be skipped.")
else:
    try:
        openai_client = OpenAI(api_key=openai_api_key)
        print("OpenAI client initialized successfully.")
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        openai_client = None


# --- KeyBERT Model Initialization ---
keybert_model = None
try:
    # 'paraphrase-multilingual-MiniLM-L12-v2' is a good model for multilingual text embeddings.
    # It allows KeyBERT to semantically understand text in multiple languages,
    # which helps even if your final output is English, as it understands the original input.
    model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
    keybert_model = KeyBERT(model=model_name)
    print(f"KeyBERT model '{model_name}' initialized successfully.")
except Exception as e:
    print(f"Error initializing KeyBERT model: {e}")
    print("Keyword extraction will be skipped.")
    keybert_model = None


# --- YouTube Data API Service Initialization ---
youtube_service = None
youtube_api_key = os.getenv("YOUTUBE_API_KEY")

if not youtube_api_key:
    print("Warning: YOUTUBE_API_KEY is not set in .env. YouTube resource linking will be skipped.")
else:
    try:
        # 'youtube' is the API name, 'v3' is the version
        youtube_service = build('youtube', 'v3', developerKey=youtube_api_key) 
        print("YouTube Data API service initialized successfully.")
    except Exception as e:
        print(f"Error initializing YouTube Data API service: {e}")
        youtube_service = None


# --- RAG: Embedding Model and Vector Store Initialization ---
embedding_function = None
vectorstore = None
chroma_db_path = os.path.join(app.root_path, "chroma_db") # Local directory for ChromaDB

try:
    # Initialize embedding model (multilingual for better semantic understanding of diverse notes)
    embedding_model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_function = SentenceTransformerEmbeddings(model_name=embedding_model_name)
    print(f"Embedding model '{embedding_model_name}' initialized successfully.")

    # Initialize ChromaDB vectorstore
    # If the directory doesn't exist, ChromaDB will create it.
    # This will load existing data or create an empty database.
    vectorstore = Chroma(
        persist_directory=chroma_db_path,
        embedding_function=embedding_function
        # Chroma 0.4.x+ automatically persists, no need for explicit .persist() here
    )
    print(f"ChromaDB vectorstore initialized at: {chroma_db_path}")

except Exception as e:
    print(f"Error initializing RAG components (Embedding Model/ChromaDB): {e}")
    print("RAG functionality will be skipped.")
    embedding_function = None
    vectorstore = None

# --- Firebase Admin SDK Initialization ---
SERVICE_ACCOUNT_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")

if not SERVICE_ACCOUNT_KEY_PATH:
    print("Error: FIREBASE_SERVICE_ACCOUNT_KEY_PATH is not set in .env")
    print("Please ensure your .env file has: FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json")
    exit(1) # Exit if the path is not set, as authentication won't work

# Check if the service account key file actually exists
if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
    print(f"Error: Firebase service account key file not found at {SERVICE_ACCOUNT_KEY_PATH}")
    print("Please download 'serviceAccountKey.json' from Firebase Console and place it in the backend directory.")
    exit(1) # Exit if the key file is missing

try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    firebase_admin.initialize_app(cred)
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    print("Please check your serviceAccountKey.json file for errors or corruption.")
    exit(1)

# --- Decorator for Protected Routes ---
def verify_firebase_token(f):
    """
    Decorator to verify Firebase ID tokens in incoming requests.
    Expects the token in the 'Authorization' header as 'Bearer <token>'.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        id_token = request.headers.get('Authorization')

        if not id_token:
            return jsonify({"message": "Authorization token missing"}), 401

        # Remove 'Bearer ' prefix if present
        if id_token.startswith('Bearer '):
            id_token = id_token.split(' ')[1]

        try:
            # Verify the ID token using Firebase Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            # Add the decoded token (which contains user UID, email, etc.) to the request context
            request.current_user = decoded_token
            print(f"Token verified for user: {decoded_token.get('email', 'N/A')} (UID: {decoded_token.get('uid')})")
        except Exception as e:
            # Catch various errors: expired token, invalid token, etc.
            return jsonify({"message": f"Invalid or expired token: {e}"}), 403 # Forbidden

        return f(*args, **kwargs)
    return decorated_function


# def is_digital_pdf(file_path):
#     try:
#         with fitz.open(file_path) as doc:
#             for page in doc:
#                 if page.get_text().strip():
#                     return True
#         return False
#     except:
#         return False

# def extract_text_from_pdf(file_path):
#     text = ""
#     with fitz.open(file_path) as doc:
#         for page in doc:
#             text += page.get_text()
#     return text

#  helper function to your app.py file to convert image data into a Base64 string
import base64

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def get_ground_truth(original_filename):
    """
    Retrieves ground truth text and keywords for a given filename.
    Assumes files are named: <filename>_text.txt and <filename>_keywords.txt
    """
    base_name = os.path.splitext(original_filename)[0]
    
    text_path = os.path.join(GROUND_TRUTH_FOLDER, f"{base_name}_text.txt")
    keywords_path = os.path.join(GROUND_TRUTH_FOLDER, f"{base_name}_keywords.txt")

    ground_truth_text = ""
    ground_truth_keywords = []

    try:
        with open(text_path, 'r', encoding='utf-8') as f:
            ground_truth_text = f.read().strip()
        
        with open(keywords_path, 'r', encoding='utf-8') as f:
            # --- UPDATED CODE FOR KEYWORDS ---
            keyword_line = f.read().strip()
            # Split by comma and strip whitespace from each keyword
            ground_truth_keywords = [k.strip() for k in keyword_line.split(',')]
            # --- END UPDATED CODE ---
    except FileNotFoundError:
        print(f"Ground truth files for {original_filename} not found.")
    
    return ground_truth_text, ground_truth_keywords

def calculate_ocr_accuracy(ground_truth_text, extracted_text):
    """Calculates character-level accuracy using Levenshtein distance."""
    if not ground_truth_text:
        return None
    
    distance = Levenshtein.distance(ground_truth_text, extracted_text)
    accuracy = (1.0 - (distance / len(ground_truth_text))) * 100
    
    return accuracy

def calculate_keyword_metrics(ground_truth_keywords, extracted_keywords):
    """Calculates precision, recall, and F1-score for keywords, ignoring punctuation."""
    if not ground_truth_keywords:
        print("DEBUG: Ground truth keywords list is empty.")
        return None, None, None
    
    # Create a translator to remove all punctuation
    translator = str.maketrans('', '', string.punctuation)
    
    # Clean and convert to lowercase sets, removing punctuation
    ground_truth_set = set(k.lower().translate(translator) for k in ground_truth_keywords)
    extracted_set = set(k.lower().translate(translator) for k in extracted_keywords)
    
    # --- ADD THESE DEBUG PRINT STATEMENTS ---
    print(f"DEBUG: Ground Truth Set: {ground_truth_set}")
    print(f"DEBUG: Extracted Set: {extracted_set}")
    print(f"DEBUG: Intersection: {ground_truth_set.intersection(extracted_set)}")
    # --- END DEBUG PRINTS ---

    true_positives = len(ground_truth_set.intersection(extracted_set))
    
    precision = true_positives / len(extracted_set) if extracted_set else 0
    recall = true_positives / len(ground_truth_set) if ground_truth_set else 0
    f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    return precision, recall, f1_score


# --- API Routes ---

@app.route("/api/hello", methods=["GET"])
def hello_world():
    """
    A simple endpoint to test basic frontend-backend communication (unprotected).
    """
    return jsonify({"message": "Hello from Flask backend!"})

@app.route("/api/status", methods=["GET"])
def get_status():
    """
    Another endpoint to demonstrate API functionality (unprotected).
    """
    return jsonify({
        "status": "running",
        "service": "NoteVerse Backend",
        "server_time": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime()) # Actual server time
    })

@app.route("/api/protected-data", methods=["GET"])
@verify_firebase_token # Apply the decorator to protect this route
def protected_data():
    """
    This route can only be accessed with a valid Firebase ID token.
    It returns data specific to the authenticated user.
    """
    # Access user information from the decoded token stored in request.current_user
    user_email = request.current_user.get('email', 'unknown user')
    user_uid = request.current_user.get('uid', 'N/A')

    return jsonify({
        "message": f"Welcome, {user_email}! This is protected data from NoteVerse.",
        "uid": user_uid,
        "source": "Authenticated Flask Backend"
    })

@app.route("/api/upload-note", methods=["POST"])
@verify_firebase_token # Protect this route: only authenticated users can upload
def upload_note():
    if 'noteImage' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400

    file = request.files['noteImage']

    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if not file: # Should be caught by previous checks, but as a safeguard
        return jsonify({"message": "File upload failed, no valid file received"}), 500

    filename = secure_filename(file.filename)
    file_extension = os.path.splitext(filename)[1].lower()
    # Create a unique filename to prevent overwrites and provide traceability
    unique_filename = f"{os.path.splitext(filename)[0]}_{int(time.time())}{file_extension}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

    # Save the original file temporarily for processing (or if PDF)
    try:
        file.save(file_path)
        print(f"Original file '{unique_filename}' saved to {file_path}")
    except Exception as e:
        print(f"Error saving original file: {e}")
        return jsonify({"message": f"Failed to save uploaded file: {e}"}), 500


    # extracted_text = ""
    # images_to_process = []

    
    
    # # --- Handle PDF to Image Conversion ---
    # if file_extension == '.pdf':
    #     text = ""
    #     print("PDF is not digital, proceeding with image conversion for OCR.")
    #     try:
    #         # Get Poppler path from environment variable (for Windows)
    #         poppler_path = os.getenv("POPPLER_PATH")
    #         if poppler_path and not os.path.exists(poppler_path):
    #             print(f"Warning: POPPLER_PATH from .env not found: {poppler_path}. Falling back to system PATH.")
    #             poppler_path = None # Allow pdf2image to search system PATH

    #         # Convert PDF pages to PIL Image objects
    #         pdf_pages = convert_from_path(
    #             file_path,
    #             dpi=300,        # Higher DPI for better OCR accuracy
    #             #grayscale=True, # Convert to grayscale directly
    #             poppler_path=poppler_path # Use specified Poppler path
    #         )
    #         images_to_process.extend(pdf_pages)
    #         print(f"Converted {len(pdf_pages)} PDF page(s) to images for OCR.")
    #     except Exception as e:
    #         os.remove(file_path) # Clean up uploaded file if conversion fails
    #         print(f"Error converting PDF to images: {e}")
    #         return jsonify({"message": f"Failed to convert PDF to images. Ensure Poppler is installed and configured: {e}"}), 500
    # # --- Handle Image Files (JPG, PNG) ---
    # elif file_extension in ['.jpg', '.jpeg', '.png']:
    #     try:
    #         image = cv2.imread(file_path)
    #         if image is None:
    #             raise ValueError("OpenCV failed to read the image file.")
    #         # Convert OpenCV image (BGR) to PIL Image (RGB) for consistency, then to numpy for processing
    #         images_to_process.append(Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)))
    #         print(f"Loaded image file {filename} for OCR.")
    #     except Exception as e:
    #         os.remove(file_path)
    #         print(f"Error loading image file for OCR: {e}")
    #         return jsonify({"message": f"Failed to load image file for OCR: {e}"}), 500
    # else:
    #     os.remove(file_path) # Remove unsupported file
    #     return jsonify({"message": f"Unsupported file type: {file_extension}. Only JPG, PNG, and PDF are supported."}), 400


    # # --- Process each image for OCR ---
    # full_text_content = []
    # if not images_to_process:
    #     os.remove(file_path) # Remove if no images were derived for OCR
    #     return jsonify({"message": "No valid pages or images found for OCR processing."}), 400

    # for i, img_pil in enumerate(images_to_process):
    #     try:
    #         gray_img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2GRAY) # Ensure grayscale
            
    #         #----- Experimentation1 Only EascyOCR-----
    #         # denoised_img = cv2.fastNlMeansDenoising(gray_img, None, 30, 7, 21)
    #         # binary_img = cv2.adaptiveThreshold(
    #         #     denoised_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    #         # )

    #         # --- NEW: Morphological Transformations (e.g., Closing operation) ---
    #         # Define a kernel (structuring element) for the morphological operation
    #         # A 3x3 or 5x5 rectangular kernel is common
    #         # kernel = np.ones((3,3), np.uint8) # 3x3 square kernel
    #         # kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3)) # Alternative way to define

    #         # 'Closing' operation: Dilation followed by Erosion.
    #         # Good for closing small holes inside foreground objects and connecting broken parts.
    #         # processed_img = cv2.morphologyEx(binary_img, cv2.MORPH_CLOSE, kernel)

    #         # Optional: 'Opening' operation (Erosion followed by Dilation).
    #         # Good for removing small objects (noise) from the foreground.
    #         # processed_img = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, kernel)

    #         # Use 'processed_img' for OCR instead of 'binary_img'
    #         # results = reader.readtext(processed_img)

    #         # --- Perform OCR using EasyOCR ---
    #         results = reader.readtext(gray_img) 

    #         page_text = ""
    #         page_confidences = []

    #         if results: # Check if any text was detected on the page
    #             for result in results:
    #                 text = result[1] # Recognized text
    #                 confidence = result[2] # Confidence score (0 to 1)

    #                 page_text += text + "\n" # Append text
    #                 page_confidences.append(confidence) # Collect confidence

    #             # Calculate average confidence for the page
    #             avg_page_confidence = np.mean(page_confidences) if page_confidences else 0
    #             print(f"OCR processed page {i+1}. Average Confidence: {avg_page_confidence:.2f}")

    #         else: # No text detected on this page
    #             print(f"OCR processed page {i+1}. No text detected.")
    #             avg_page_confidence = 0

    #         full_text_content.append(f"--- Page {i+1} (Confidence: {avg_page_confidence:.2f}) ---\n{page_text}")
    #         # We can also store confidence with the note document later if desired

    #     except Exception as e:
    #         print(f"Error during OCR for page {i+1}: {e}")
    #         full_text_content.append(f"--- Page {i+1} (OCR Failed) ---\n")
    #         # Continue processing other pages even if one fails

    # --- NEW: Combination 2 (LLM Only) ---
    extracted_text = ""
    base64_images = []
    
    # Handle PDF to Image Conversion and Base64 Encoding
    if file_extension == '.pdf':
        print("PDF detected, converting to images for LLM vision processing.")
        try:
            poppler_path = os.getenv("POPPLER_PATH")
            if poppler_path and not os.path.exists(poppler_path):
                poppler_path = None
            
            pdf_pages = convert_from_path(file_path, dpi=300, poppler_path=poppler_path)
            
            # Save each page to a temporary file, encode it, and then delete the file
            for i, page_img in enumerate(pdf_pages):
                temp_img_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_page_{int(time.time())}_{i}.jpg")
                page_img.save(temp_img_path, 'JPEG')
                base64_images.append(encode_image(temp_img_path))
                os.remove(temp_img_path)
            print(f"Converted {len(base64_images)} PDF page(s) to Base64 for LLM.")
        except Exception as e:
            os.remove(file_path)
            print(f"Error converting PDF to images: {e}")
            return jsonify({"message": f"Failed to convert PDF to images for LLM: {e}"}), 500
    
    # Handle direct Image Files (JPG, PNG)
    elif file_extension in ['.jpg', '.jpeg', '.png']:
        print(f"Image file detected, encoding for LLM vision processing.")
        base64_images.append(encode_image(file_path))
    else:
        os.remove(file_path)
        return jsonify({"message": f"Unsupported file type: {file_extension}. Only JPG, PNG, and PDF are supported."}), 400

    # Process each Base64 encoded image with LLM Vision API
    full_text_content = []
    if openai_client and base64_images:
        print("Attempting LLM-based text extraction...")
        try:
            for b64_image in base64_images:
                llm_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this image as accurately as possible. Pay close attention to handwritten content and formatting. Do not add any new information."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                        ]
                    }],
                    temperature=0.1,
                    max_tokens=4000
                )
                full_text_content.append(llm_response.choices[0].message.content.strip())
            
            extracted_text = "\n\n".join(full_text_content)
            final_text_for_db = extracted_text
            print("LLM-based text extraction successful.")
        except Exception as llm_error:
            print(f"Error during LLM text extraction: {llm_error}. Skipping LLM process.")
            extracted_text = ""
            final_text_for_db = ""
    else:
        print("OpenAI client not initialized or no valid images to process. Skipping LLM text extraction.")
        extracted_text = ""
        final_text_for_db = ""
    # --- END Combination 2 ---     
    

    # extracted_text = "\n\n".join(full_text_content) # Combine text from all pages
    # final_text_for_db = extracted_text # Default to raw OCR text

    #------ Experimentation1 Only EascyOCR-----
    # --- LLM Post-processing for Accuracy Improvement ---
    # Only process if there's significant text and LLM client is available
    # if openai_client and len(extracted_text.strip()) > 50: # Only call LLM if there's enough text
    #     print("Attempting LLM post-processing for OCR text...")
    #     try:
    #         llm_response = openai_client.chat.completions.create(
    #                 model="gpt-3.5-turbo",
    #                 messages=[
    #                     # System message: Make it explicitly clear about language handling
    #                     {"role": "system", "content": "You are a highly accurate text corrector and interpreter. Your task is to take raw, potentially erroneous OCR text, correct typos, fix grammar, make it readable, and infer contextually accurate words where the OCR failed. **Crucially, you must preserve the original language of the input text.** Do not translate. If the input is Hindi, your output must be in Hindi. If the input is Marathi, output in Marathi. If English, output in English. Do not add new information not present in the original text. Maintain the original meaning. Respond only with the corrected text."},
    #                     # User message: No change here, as it contains the raw OCR text
    #                     {"role": "user", "content": f"Here is the OCR output. Please clean it up and make it coherent, preserving the original language:\n\n{extracted_text}"}
    #                 ],
    #                 temperature=0.1,
    #                 max_tokens=1000
    #         )
    #         cleaned_llm_output = llm_response.choices[0].message.content.strip()
    #         if cleaned_llm_output: # Ensure LLM returned something
    #             final_text_for_db = cleaned_llm_output
    #             print("LLM post-processing successful. Text cleaned.")
    #         else:
    #             print("LLM post-processing returned empty. Using raw OCR text.")

    #     except Exception as llm_error:
    #         print(f"Error during LLM post-processing: {llm_error}. Using raw OCR text.")
    #         # final_text_for_db remains extracted_text (raw OCR)
    # elif not openai_client:
    #     print("OpenAI client not initialized. Skipping LLM post-processing.")
    # else:
    #     print("Extracted text too short for LLM post-processing. Skipping.")


    # --- Keyword Extraction with KeyBERT ---
    extracted_keywords = [] # Initialize as empty list
    if keybert_model and len(final_text_for_db.strip()) > 50: # Only if model loaded & text is significant
        print("Attempting keyword extraction...")
        try:
            # docs: The text to extract keywords from
            # keyphrase_ngram_range: Extract single words (1,1) or up to 2-word phrases (1,2)
            # top_n: Number of keywords to extract
            # diversity: Higher diversity means less similar keywords are chosen (0 to 1)
            keywords_with_scores = keybert_model.extract_keywords(
                docs=final_text_for_db,
                keyphrase_ngram_range=(1, 1),
                # We are NOT using stop_words='english' here.
                # This is because the multilingual model's embeddings are robust,
                # and the LLM cleaning handles basic words.
                # If you find too many common words, you can re-add `stop_words='english'`
                # or custom English stop words.
                top_n= 7, # Extract top 10 keywords/phrases
                diversity=0.7 # Encourage a good variety of keywords
            )
            # Extract just the keyword string, discarding the score for storage
            extracted_keywords = [keyword for keyword, _ in keywords_with_scores]
            print(f"Extracted keywords: {extracted_keywords}")
        except Exception as kw_error:
            print(f"Error during keyword extraction: {kw_error}. Keywords will be empty.")
    elif not keybert_model:
        print("KeyBERT model not initialized. Skipping keyword extraction.")
    else:
        print("Final text too short for keyword extraction. Skipping keyword extraction.")


    # Initialize note_document structure (partially for now)
    temp_note_id = ObjectId() # Generate an ID upfront for use in chunks
    note_document = {
        "_id": temp_note_id, # Assign the generated ID
        "user_id": request.current_user.get('uid'),
        "original_filename": filename,
        "stored_file_path": file_path,
        "extracted_text": final_text_for_db,
        "raw_ocr_text": extracted_text,
        "upload_date": time.time(),
        "tags": [],
        "topics": extracted_keywords, # Correctly use extracted_keywords
        "resource_links": []
    }

    # --- NEW: Evaluation Metrics Calculation and Logging ---
    print("\n--- Starting Automated Performance Evaluation ---")
    ground_truth_text, ground_truth_keywords = get_ground_truth(filename)
    results_filename = f"{os.path.splitext(filename)[0]}_results.txt"
    results_path = os.path.join(RESULTS_FOLDER, results_filename)
    
    Experimentation_number = "2" # Manually change this for each test (e.g., "1", "2", "3", "4")
    
    if ground_truth_text:
        # Calculate OCR Accuracy
        accuracy = calculate_ocr_accuracy(ground_truth_text, final_text_for_db)
        print(f"OCR Accuracy: {accuracy:.2f}%")
        
        # Calculate Keyword Metrics
        if ground_truth_keywords:
            precision, recall, f1score = calculate_keyword_metrics(ground_truth_keywords, extracted_keywords)
            print(f"Keyword Precision: {precision:.2f}")
            print(f"Keyword Recall: {recall:.2f}")
            print(f"Keyword F1-Score: {f1score:.2f}")
        else:
            print("Ground truth keywords not available. Skipping keyword evaluation.")
    else:
        print("Ground truth text not available. Skipping OCR and keyword evaluation.")

    with open(results_path, 'w') as f:
        f.write(f"Combination: {Experimentation_number}\n")
        f.write(f"Filename: {filename}\n")
        f.write(f"OCR Accuracy: {accuracy:.2f}%\n")
        f.write(f"Keyword Precision: {precision:.2f}\n")
        f.write(f"Keyword Recall: {recall:.2f}\n")
        f.write(f"Keyword F1-Score: {f1score:.2f}\n")
    
    print(f"Results saved to: {results_path}")

    print("--- Performance Evaluation Complete ---\n")



    # --- RAG: Text Chunking and Vector Storage ---
    chunks_to_add = [] # Initialize here to ensure it always exists for the final return
    if vectorstore and len(final_text_for_db.strip()) > 100: # Only if vectorstore loaded and text is significant
        print("Attempting to chunk text and store embeddings in ChromaDB...")
        try:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len
            )

            chunks = text_splitter.split_text(final_text_for_db)

            for i, chunk_content in enumerate(chunks):
                chunk_metadata = {
                    "user_id": request.current_user.get('uid'),
                    "note_id": str(temp_note_id), # Use the generated note ID
                    "original_filename": filename,
                    "upload_date": time.time(),
                    "chunk_index": i,
                    "chunk_id": f"{str(temp_note_id)}_chunk_{i}"
                }
                chunks_to_add.append(Document(page_content=chunk_content, metadata=chunk_metadata))

            if chunks_to_add:
                vectorstore.add_documents(chunks_to_add)
                # vectorstore.persist() # Deprecated: Chroma 0.4.x+ auto-persists. Remove this line.
                print(f"Added {len(chunks_to_add)} chunks to ChromaDB for note {unique_filename}.")
            else:
                print("No chunks generated for RAG due to text content.")

        except Exception as rag_error:
            print(f"Error during RAG text chunking or vector storage: {rag_error}. RAG functionality might be limited.")
    elif not vectorstore: # Only print this warning if it's the specific initialization failure
        print("Vectorstore not available. Skipping RAG text chunking and storage.") # Adjusted message
    else: # Text too short
        print("Final text too short for RAG chunking and storage. Skipping.")

    # --- MongoDB Storage (Final Save) ---
    if db is not None:
        try:
            notes_collection = db.notes
            note_document = {
                "_id": temp_note_id, # Ensure _id is set from the start
                "user_id": request.current_user.get('uid'),
                "original_filename": filename,
                "stored_file_path": file_path,
                "extracted_text": final_text_for_db,
                "raw_ocr_text": extracted_text,
                "upload_date": time.time(),
                "tags": [],
                "topics": extracted_keywords,
                "resource_links": []
            }
            result = notes_collection.insert_one(note_document)
            print(f"Note saved to MongoDB with ID: {result.inserted_id}")
            return jsonify({
                "message": f"File '{filename}' uploaded, processed, and saved to database!",
                "note_id": str(result.inserted_id),
                "extracted_text_preview": final_text_for_db[:500] + "..." if len(final_text_for_db) > 500 else final_text_for_db,
                "user_uid": request.current_user.get('uid'),
                "keywords": extracted_keywords,
                "rag_chunks_added": len(chunks_to_add) if 'chunks_to_add' in locals() else 0 # Ensure this is safe
            }), 200
        except Exception as db_error:
            print(f"Error saving note to MongoDB: {db_error}")
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"message": f"File uploaded and processed, but failed to save to database: {db_error}"}), 500
    else: # MongoDB not connected
        print("MongoDB not connected. Skipping database storage.")
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({
            "message": f"File '{filename}' uploaded and processed, but database connection not available.",
            "filename": unique_filename,
            "extracted_text_preview": final_text_for_db[:500] + "..." if len(final_text_for_db) > 500 else final_text_for_db,
            "user_uid": request.current_user.get('uid'),
            "keywords": extracted_keywords,
            "rag_chunks_added": len(chunks_to_add) if 'chunks_to_add' in locals() else 0
        }), 200
    
    # Ensure a return is always hit if previous paths don't return
    return jsonify({"message": "File upload failed due to unhandled error."}), 500
    




@app.route("/api/notes/<string:note_id>/resources", methods=["GET"])
@verify_firebase_token # Ensure only authenticated users can fetch resources
def get_note_resources(note_id):
    if db is None:
        return jsonify({"message": "Database not connected. Cannot fetch resources."}), 500

    try:
        # 1. Fetch the note from MongoDB
        # Ensure only the authenticated user's notes are retrieved
        note = db.notes.find_one({"_id": ObjectId(note_id), "user_id": request.current_user.get('uid')})

        if not note:
            return jsonify({"message": "Note not found or you don't have access."}), 404

        # 2. Get keywords from the note
        keywords = note.get('topics', []) # 'topics' field stores keywords from KeyBERT
        if not keywords:
            return jsonify({"message": "No keywords found for this note. Cannot fetch resources."}), 404

        # 3. Search YouTube for videos
        if not youtube_service:
            return jsonify({"message": "YouTube API not initialized. Cannot fetch resources."}), 500

        # Construct a query string from keywords
        # For better results, join a few relevant keywords. Max length for YouTube API 'q' is 500 characters.
        query_string = " ".join(keywords[:5]) # Use top 5 keywords for the query
        if not query_string:
            return jsonify({"message": "Empty query for Youtube."}), 400

        print(f"Searching YouTube for: '{query_string}'")
        search_request = youtube_service.search().list(
            q=query_string,
            part='snippet',  # Request snippet details (title, description, thumbnails)
            type='video',    # Only search for videos
            maxResults=5,    # Get top 5 relevant videos
            relevanceLanguage='en' # Optional: Focus search on English videos
        )
        search_response = search_request.execute()

        # 4. Process YouTube results
        videos = []
        for item in search_response.get('items', []):
            video_id = item['id']['videoId']
            title = item['snippet']['title']
            description = item['snippet']['description']
            thumbnail_url = item['snippet']['thumbnails']['high']['url'] # High quality thumbnail

            videos.append({
                "id": video_id,
                "title": title,
                "description": description,
                "thumbnail": thumbnail_url,
                "url": f"https://www.youtube.com/watch?v={video_id}" # Construct full YouTube URL
            })

        # 5. Return the list of videos
        return jsonify({
            "note_id": note_id,
            "keywords": keywords,
            "videos": videos
        }), 200

    except Exception as e:
        print(f"Error fetching resources for note {note_id}: {e}")
        return jsonify({"message": f"Failed to fetch resources: {str(e)}"}), 500



@app.route("/api/my-notes", methods=["GET"])
@verify_firebase_token
def get_my_notes():
    if db is None:
        return jsonify({"message": "Database not connected. Cannot retrieve notes."}), 500

    try:
        user_uid = request.current_user.get('uid')
        # Check if a specific note_id is requested (for NoteDetail component)
        note_id = request.args.get('note_id') 

        if note_id:
            # Fetch a single note by ID for the current user
            note = db.notes.find_one({"_id": ObjectId(note_id), "user_id": user_uid})
            if not note:
                return jsonify({"message": "Note not found or you don't have access."}), 404

            # Convert ObjectId to string and prepare for jsonify
            note['_id'] = str(note['_id']) 
            return jsonify({"message": "Note retrieved successfully.", "notes": [note]}), 200 # Return as list for consistency

        else:
            # Fetch all notes for the user (for NoteList component)
            notes_cursor = db.notes.find(
                {"user_id": user_uid},
                {"_id": 1, "original_filename": 1, "extracted_text": 1, "upload_date": 1, "topics": 1}
            ).sort("upload_date", -1)

            notes_list = []
            for note in notes_cursor:
                notes_list.append({
                    "id": str(note['_id']),
                    "filename": note['original_filename'],
                    "preview_text": note['extracted_text'][:200] + "..." if len(note['extracted_text']) > 200 else note['extracted_text'],
                    "upload_date": note['upload_date'],
                    "topics": note.get('topics', [])
                })

            return jsonify({
                "message": "Notes retrieved successfully.",
                "notes": notes_list
            }), 200

    except Exception as e:
        print(f"Error retrieving notes for user {user_uid} (ID: {note_id}): {e}")
        return jsonify({"message": f"Failed to retrieve notes: {str(e)}"}), 500


@app.route("/api/notes/<string:note_id>/generate-quiz", methods=["POST"])
@verify_firebase_token # Only authenticated users can generate quizzes
def generate_quiz(note_id):
    if db is None:
        return jsonify({"message": "Database not connected. Cannot generate quiz."}), 500
    if not openai_client:
        return jsonify({"message": "OpenAI client not initialized. Cannot generate quiz."}), 500

    try:
        user_uid = request.current_user.get('uid')
        # 1. Fetch the note from MongoDB
        note = db.notes.find_one({"_id": ObjectId(note_id), "user_id": user_uid})

        if not note:
            return jsonify({"message": "Note not found or you don't have access."}), 404

        note_text = note.get('extracted_text', '').strip()
        if len(note_text) < 100: # Require a minimum amount of text to generate a meaningful quiz
            return jsonify({"message": "Note text too short to generate a meaningful quiz (min 100 chars required)."}), 400

        print(f"Generating quiz for note ID: {note_id} (User: {user_uid})")

        # 2. Craft the LLM Prompt for MCQ Generation (CRUCIAL STEP)
        # We ask for JSON output for easy parsing.
        system_prompt = """You are an expert educator and quiz generator. Your task is to create multiple-choice questions (MCQs) based on the provided text.
 
            Strictly adhere to the following format and rules:

            Generate exactly 3 to 5 MCQs.

            Each MCQ must have:

                A 'question' field (string).

                An 'options' field (an array of 4 strings).

                A 'correct_answer' field (string, one of the options).

            Ensure the questions are clear, directly related to the text, and have one unambiguous correct answer.

            The output MUST be a JSON array of MCQ objects, and nothing else. Do NOT wrap the array in any other object (e.g., no {"quiz": [...]}). Do NOT add any introductory or concluding text, or conversational filler.

            All output text must be in English.

            Example JSON format (Note: this is just an example of one MCQ in the array):
            [
            {
            "question": "What is the capital of France?",
            "options": ["Berlin", "Madrid", "Paris", "Rome"],
            "correct_answer": "Paris"
            }
            ]
            """
        user_prompt = f"Generate MCQs based on the following text:\n\n{note_text}"

        llm_response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo-1106", # Using a newer model version if available, or "gpt-3.5-turbo"
            response_format={"type": "json_object"}, # <--- CRUCIAL: Request JSON object response
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5, # Slightly higher temperature for more varied questions
            max_tokens=1500  # Adjust max_tokens based on expected quiz length
        )


        # 3. Parse the LLM's JSON response
        quiz_json_string = llm_response.choices[0].message.content.strip()

        # --- NEW: Always print raw LLM response for debugging ---
        print(f"DEBUG: Raw LLM response from OpenAI (first 500 chars): {quiz_json_string[:500]}...")
        # --- END NEW ---

        try:
            # The LLM's response_format={"type": "json_object"} typically forces the output to be
            # a single JSON object. The prompt asks for an array inside.
            parsed_quiz_data = json.loads(quiz_json_string)
            generated_mcqs = [] # Initialize as empty list

            # Check if it's a list (as requested in prompt)
            if isinstance(parsed_quiz_data, list):
                generated_mcqs = parsed_quiz_data
            # Check if it's an object with a "quiz" key (common LLM behavior despite prompt)
            elif isinstance(parsed_quiz_data, dict) and "quiz" in parsed_quiz_data:
                if isinstance(parsed_quiz_data["quiz"], list):
                    generated_mcqs = parsed_quiz_data["quiz"]
                else:
                    # Case: {"quiz": {...}} instead of {"quiz": [...]}, try to wrap it
                    generated_mcqs = [parsed_quiz_data["quiz"]] if isinstance(parsed_quiz_data["quiz"], dict) else []
                    if not generated_mcqs:
                        raise ValueError("LLM returned 'quiz' key but its value is not a list or valid object.")
            # Check if it's a single MCQ object (what we just saw in your debug log)
            elif isinstance(parsed_quiz_data, dict) and "question" in parsed_quiz_data and "options" in parsed_quiz_data:
                generated_mcqs = [parsed_quiz_data] # Wrap the single MCQ object in a list
            else:
                raise ValueError("LLM response not in expected quiz format. It's not a list, an object with 'quiz' key, or a single MCQ object.")

            if not generated_mcqs: # Final check to ensure we got something
                raise ValueError("Generated MCQs list is empty after parsing.")
        except json.JSONDecodeError as e:
            print(f"Error decoding LLM JSON response: {e}")
            # Raw LLM response already printed above if this block is hit
            return jsonify({"message": f"Quiz generation failed: Invalid JSON from LLM. {e}"}), 500
        except ValueError as e:
            print(f"Error parsing LLM response format: {e}")
            # Raw LLM response already printed above if this block is hit
            return jsonify({"message": f"Quiz generation failed: Unexpected LLM response format. {e}"}), 500

        
        # --- NEW: Save the generated quiz to MongoDB ---
        if db is None: # Check for DB connection before trying to save
            return jsonify({"message": "Database not connected. Quiz generated but cannot be saved."}), 500

        quizzes_collection = db.quizzes # Get a reference to the 'quizzes' collection

        quiz_document = {
            "user_id": user_uid,          # Link to the user who generated it
            "note_id": ObjectId(note_id), # Link to the original note
            "generation_date": time.time(), # Timestamp
            "quiz_questions": generated_mcqs # Store the array of MCQs
        }

        result = quizzes_collection.insert_one(quiz_document)
        quiz_id = str(result.inserted_id) # Get the ID of the new quiz document
        print(f"Quiz saved to MongoDB with ID: {quiz_id}")

        # --- END OF NEW: Quiz saving logic ---

        # 4. Return the generated quiz and its ID
        return jsonify({
            "message": "Quiz generated and saved successfully!",
            "quiz": generated_mcqs, # Still return the quiz for frontend immediate use
            "note_id": note_id,
            "quiz_id": quiz_id # <--- Return the new quiz ID
        }), 200

    except Exception as e:
        print(f"Error generating or saving quiz for note {note_id}: {e}")
        return jsonify({"message": f"Quiz generation failed: {str(e)}"}), 500


@app.route("/api/quizzes/<string:quiz_id>", methods=["GET"])
@verify_firebase_token # Ensure only authenticated users can access quizzes
def get_quiz(quiz_id):
    if db is None:
        return jsonify({"message": "Database not connected. Cannot retrieve quiz."}), 500

    try:
        user_uid = request.current_user.get('uid')
        # Fetch the quiz document by ID, linked to the user
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id), "user_id": user_uid})

        if not quiz:
            return jsonify({"message": "Quiz not found or you don't have access."}), 404

        # Convert ObjectId to string and prepare for jsonify
        quiz['_id'] = str(quiz['_id'])
        # Convert note_id ObjectId to string too if it's there
        if 'note_id' in quiz and isinstance(quiz['note_id'], ObjectId):
            quiz['note_id'] = str(quiz['note_id'])

        return jsonify({
            "message": "Quiz retrieved successfully.",
            "quiz": quiz
        }), 200

    except Exception as e:
        print(f"Error retrieving quiz {quiz_id} for user {user_uid}: {e}")
        return jsonify({"message": f"Failed to retrieve quiz: {str(e)}"}), 500


@app.route("/api/my-quizzes", methods=["GET"])
@verify_firebase_token
def get_my_quizzes():
    if db is None:
        return jsonify({"message": "Database not connected."}), 500
    try:
        user_uid = request.current_user.get('uid')
        quizzes_cursor = db.quizzes.find(
            {"user_id": user_uid}
        ).sort("generation_date", -1)
        quizzes_list = []
        for quiz in quizzes_cursor:
            note_title = "Untitled Note"
            if 'note_id' in quiz and isinstance(quiz['note_id'], ObjectId):
                note = db.notes.find_one({"_id": quiz['note_id']})
                if note:
                    note_title = note.get('original_filename', 'Untitled Note')
            quizzes_list.append({
                "id": str(quiz['_id']),
                "note_id": str(quiz['note_id']),
                "note_title": note_title,
                "generation_date": quiz['generation_date'],
            })
        return jsonify({
            "message": "Quizzes retrieved successfully.",
            "quizzes": quizzes_list
        }), 200
    except Exception as e:
        print(f"Error retrieving quizzes for user {user_uid}: {e}")
        return jsonify({"message": f"Failed to retrieve quizzes: {str(e)}"}), 500


@app.route("/api/rag-query", methods=["POST"])
@verify_firebase_token # Ensure only authenticated users can ask RAG queries
def rag_query():
    if not openai_client:
        return jsonify({"message": "RAG failed: OpenAI client not initialized."}), 500
    if not vectorstore: # This check is now here, but vectorstore should not be None
        print("RAG query received but vectorstore is not available globally.") # Add a debug print
        return jsonify({"message": "RAG failed: Vectorstore not available. Please check server logs."}), 500 # More specific message

    data = request.get_json()
    user_question = data.get('question', '').strip()
    
    if not user_question:
        return jsonify({"message": "Please provide a question for the RAG query."}), 400

    user_uid = request.current_user.get('uid')
    print(f"RAG query from user {user_uid}: '{user_question}'")

    try:
        # 1. Retrieve Relevant Chunks from ChromaDB
        # We filter by user_id in metadata to only search within the user's own notes.
        # k=4 means retrieve the top 4 most relevant chunks. Adjust as needed.
        # `filter` uses MongoDB-style queries on metadata.
        retrieved_docs = vectorstore.similarity_search(
            query=user_question,
            k=4,
            filter={"user_id": user_uid} # <--- CRUCIAL: Filter by user_id
        )

        if not retrieved_docs:
            return jsonify({"message": "No relevant information found in your notes for this question."}), 200 # Return 200, not an error

        # 2. Augment the LLM Prompt with Retrieved Context
        context_text = "\n\n".join([doc.page_content for doc in retrieved_docs])

        # Design the RAG prompt: Instruct the LLM to answer based *only* on context
        system_prompt = """You are a helpful and knowledgeable assistant. Your task is to answer the user's question truthfully and concisely, based SOLELY on the provided context. If the answer is not available in the context, state that you cannot find the answer in the provided information.
        Context:
        """ + context_text + """

        Question:
        """
    
        user_prompt = user_question
        # 3. Call the LLM for Generation
        llm_response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", # Use gpt-3.5-turbo for cost/speed, or gpt-4 for better reasoning
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1, # Low temperature for factual, non-creative answers
            max_tokens=500 # Limit answer length
        )
        
        rag_answer = llm_response.choices[0].message.content.strip()

        # Optional: Return retrieved sources (chunk_id, original_filename) for transparency
        sources = []
        for doc in retrieved_docs:
            sources.append({
                "chunk_id": doc.metadata.get('chunk_id'),
                "note_id": doc.metadata.get('note_id'),
                "original_filename": doc.metadata.get('original_filename')
            })

        return jsonify({
            "message": "RAG query successful.",
            "answer": rag_answer,
            "sources": sources
        }), 200

    except Exception as e:
        print(f"Error during RAG query for user {user_uid} and question '{user_question}': {e}")
        return jsonify({"message": f"RAG query failed: {str(e)}"}), 500


@app.route("/api/dashboard-stats", methods=["GET"])
@verify_firebase_token # Ensure only authenticated users can access their dashboard stats
def get_dashboard_stats():
    if db is None:
        return jsonify({"message": "Database not connected. Cannot retrieve dashboard stats."}), 500

    try:
        user_uid = request.current_user.get('uid')

        # 1. Number of notes uploaded
        notes_count = db.notes.count_documents({"user_id": user_uid})

        # 2. Quizzes solved with accuracy (requires iterating through quiz results)
        # For simplicity, let's just count quizzes generated for now.
        # A full implementation would involve storing quiz submissions and their scores.
        quizzes_generated_count = db.quizzes.count_documents({"user_id": user_uid})
        # Placeholder for actual solved quizzes/accuracy (can expand later)
        quizzes_solved = 0
        average_accuracy = 0.0

        # 3. Days streak (placeholder)
        days_streak = 0

        # 4. Usage time (placeholder)
        usage_time_minutes = 0

        return jsonify({
            "message": "Dashboard stats retrieved successfully.",
            "stats": {
                "notes_uploaded": notes_count,
                "quizzes_generated": quizzes_generated_count,
                "quizzes_solved": quizzes_solved, # Placeholder for actual solved quizzes
                "average_accuracy": average_accuracy, # Placeholder for actual average accuracy (e.g., 86.2)
                "days_streak": days_streak, # Placeholder (e.g., 12)
                "study_time_hours": 87.5, # Placeholder (e.g., 87.5)
                # Mock data for charts
                "weekly_progress": [
                    {"day": "Mon", "time_h": 2.5, "accuracy": 85},
                    {"day": "Tue", "time_h": 3.2, "accuracy": 76},
                    {"day": "Wed", "time_h": 1.8, "accuracy": 92},
                    {"day": "Thu", "time_h": 4.1, "accuracy": 88},
                    {"day": "Fri", "time_h": 2.9, "accuracy": 76},
                    {"day": "Sat", "time_h": 5.0, "accuracy": 90}, # Add weekend for full week
                    {"day": "Sun", "time_h": 3.5, "accuracy": 82},
                ],
                "topic_mastery": [
                    {"topic": "Linear Algebra", "percentage": 92, "change": 5},
                    {"topic": "Operating Systems", "percentage": 88, "change": 3},
                    {"topic": "Machine Learning", "percentage": 85, "change": -2},
                    {"topic": "Database Systems", "percentage": 91, "change": 7},
                ]
            }
        }), 200
    
    except Exception as e:
        print(f"Error retrieving dashboard stats for user {user_uid}: {e}")
        return jsonify({"message": f"Failed to retrieve dashboard stats: {str(e)}"}), 500



@app.route("/api/notes/search", methods=["GET"])
@verify_firebase_token # Ensure only authenticated users can search their notes
def search_notes():
    if db is None:
        return jsonify({"message": "Database not connected. Cannot perform search."}), 500
    if not vectorstore: # Ensure vectorstore is initialized for semantic search
        return jsonify({"message": "Search failed: Vectorstore not initialized."}), 500

    user_query = request.args.get('query', '').strip()
    if not user_query:
        return jsonify({"message": "Please provide a search query."}), 400

    user_uid = request.current_user.get('uid')
    print(f"User {user_uid} searching notes for query: '{user_query}'")

    try:
        # Perform semantic search in ChromaDB
        # Filter by user_id to ensure users only search their own notes
        # k=5 means retrieve top 5 most relevant chunks (can be adjusted)
        retrieved_chunks = vectorstore.similarity_search(
            query=user_query,
            k=5, # Retrieve top 5 relevant chunks
            filter={"user_id": user_uid}
        )

        if not retrieved_chunks:
            return jsonify({"message": "No relevant notes found for your query."}), 200

        # Process retrieved chunks to return unique notes (since multiple chunks can come from one note)
        found_notes_info = {} # Use a dict to store unique notes by note_id
        for doc in retrieved_chunks:
            note_id = doc.metadata.get('note_id')
            original_filename = doc.metadata.get('original_filename')

            if note_id and note_id not in found_notes_info:
                # Fetch basic info for the note from MongoDB (or rely purely on metadata if comprehensive)
                # For a cleaner response, let's fetch the actual note doc
                note_from_db = db.notes.find_one(
                    {"_id": ObjectId(note_id), "user_id": user_uid},
                    {"_id": 1, "original_filename": 1, "extracted_text": 1, "upload_date": 1, "topics": 1}
                )
                if note_from_db:
                    found_notes_info[note_id] = {
                        "id": str(note_from_db['_id']),
                        "filename": note_from_db['original_filename'],
                        "preview_text": note_from_db['extracted_text'][:200] + "..." if len(note_from_db['extracted_text']) > 200 else note_from_db['extracted_text'],
                        "upload_date": note_from_db['upload_date'],
                        "topics": note_from_db.get('topics', []),
                        "relevance_chunk": doc.page_content[:100] + "..." # Show a snippet of the relevant chunk
                    }

        # Convert dictionary to list for the final response
        search_results = list(found_notes_info.values())

        return jsonify({
            "message": f"Found {len(search_results)} relevant notes.",
            "notes": search_results # Return notes in the same format as /api/my-notes
        }), 200

    except Exception as e:
        print(f"Error during search query for user {user_uid} and query '{user_query}': {e}")
        return jsonify({"message": f"Search failed: {str(e)}"}), 500



# --- Application Entry Point ---
if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    # Run the Flask app in debug mode if FLASK_ENV is 'development'
    # host='0.0.0.0' makes it accessible externally (useful in containers/some networks)
    # debug=True enables auto-reloading and debugger (controlled by FLASK_ENV from .env)
    app.run(debug=True, host='0.0.0.0', port=port)