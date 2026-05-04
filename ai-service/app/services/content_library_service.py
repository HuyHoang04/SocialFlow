# Content Library Service
# Handles file upload, storage, and text extraction from documents

import os
import uuid
from typing import Optional, Tuple
from datetime import datetime
import mimetypes
from pathlib import Path
from app.utils.logger import setup_logger

# LangChain Document Loaders
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader

logger = setup_logger(__name__)

class ContentLibraryService:
    """Manage content library uploads and text extraction"""
    
    def __init__(self, upload_dir: str = "/uploads/rag-library"):
        self.upload_dir = upload_dir
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        
        # Create upload directory if it doesn't exist
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
        logger.info(f"Content library upload directory: {self.upload_dir}")
    
    def save_uploaded_file(
        self,
        file_content: bytes,
        file_name: str,
        brand_id: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Save uploaded file to storage.
        Returns: (success, file_path, error_message)
        """
        try:
            # Validate file size
            if len(file_content) > self.max_file_size:
                error = f"File too large: {len(file_content)} > {self.max_file_size}"
                logger.error(error)
                return False, "", error
            
            # Generate unique filename
            file_ext = Path(file_name).suffix
            unique_name = f"{brand_id}_{uuid.uuid4().hex}{file_ext}"
            file_path = os.path.join(self.upload_dir, unique_name)
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"Saved file: {file_path} ({len(file_content)} bytes)")
            return True, file_path, None
        
        except Exception as e:
            error = f"File save error: {e}"
            logger.error(error)
            return False, "", error
    
    def extract_text_from_file(
        self,
        file_path: str,
        file_type: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Extract text from uploaded file based on type.
        Supports: TEXT, PDF, IMAGE (OCR), DOCUMENT
        Returns: (success, extracted_text, error_message)
        """
        try:
            if file_type == "TEXT":
                return self._extract_text_file(file_path)
            elif file_type == "PDF":
                return self._extract_pdf(file_path)
            elif file_type == "IMAGE":
                return self._extract_image_ocr(file_path)
            elif file_type == "DOCUMENT":
                return self._extract_document(file_path)
            else:
                error = f"Unsupported file type: {file_type}"
                logger.warning(error)
                return False, "", error
        
        except Exception as e:
            error = f"Text extraction error: {e}"
            logger.error(error)
            return False, "", error
    
    def _extract_text_file(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            logger.info(f"Extracted text from {file_path}: {len(text)} chars")
            return True, text, None
        except Exception as e:
            error = f"Text file extraction failed: {e}"
            logger.error(error)
            return False, "", error
    
    def _extract_pdf(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """Extract text from PDF file using LangChain's PyPDFLoader"""
        try:
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            
            text_parts = []
            for i, page in enumerate(pages):
                if page.page_content:
                    text_parts.append(f"--- Page {i + 1} ---\n{page.page_content}")
            
            extracted_text = "\n\n".join(text_parts)
            logger.info(f"Extracted PDF from {file_path}: {len(extracted_text)} chars from {len(pages)} pages")
            return True, extracted_text, None
        
        except Exception as e:
            error = f"PDF extraction failed: {e}"
            logger.error(error)
            return False, "", error
    
    def _extract_image_ocr(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """Extract text from image using OCR (Tesseract)"""
        try:
            try:
                import pytesseract
                from PIL import Image
            except ImportError:
                error = "pytesseract or Pillow not installed. Run: pip install pytesseract pillow"
                logger.error(error)
                return False, "", error
            
            try:
                img = Image.open(file_path)
                text = pytesseract.image_to_string(img)
                
                logger.info(f"Extracted OCR from {file_path}: {len(text)} chars")
                return True, text, None
            except Exception as e:
                error = f"Tesseract OCR failed (check if tesseract-ocr is installed): {e}"
                logger.warning(error)
                # Return empty text instead of failing - image might not have text
                return True, "[No text detected in image]", None
        
        except Exception as e:
            error = f"Image OCR extraction failed: {e}"
            logger.error(error)
            return False, "", error
    
    def _extract_document(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """Extract text from document files (DOCX, etc)"""
        try:
            file_ext = Path(file_path).suffix.lower()
            
            if file_ext == ".docx":
                return self._extract_docx(file_path)
            elif file_ext == ".txt":
                return self._extract_text_file(file_path)
            else:
                error = f"Unsupported document format: {file_ext}"
                logger.warning(error)
                # Fallback: try reading as text
                return self._extract_text_file(file_path)
        
        except Exception as e:
            error = f"Document extraction failed: {e}"
            logger.error(error)
            return False, "", error
    
    def _extract_docx(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """Extract text from DOCX file using LangChain's Docx2txtLoader"""
        try:
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
            
            extracted_text = "\n".join([doc.page_content for doc in docs])
            
            logger.info(f"Extracted DOCX from {file_path}: {len(extracted_text)} chars")
            return True, extracted_text, None
        
        except Exception as e:
            error = f"DOCX extraction failed: {e}"
            logger.error(error)
            return False, "", error
    
    def get_file_type(self, file_name: str) -> str:
        """Determine file type from extension"""
        ext = Path(file_name).suffix.lower()
        
        # Image extensions
        if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']:
            return "IMAGE"
        
        # PDF
        elif ext == '.pdf':
            return "PDF"
        
        # Documents
        elif ext in ['.docx', '.doc', '.odt']:
            return "DOCUMENT"
        
        # Text
        elif ext in ['.txt', '.md', '.csv']:
            return "TEXT"
        
        # Audio (for future use)
        elif ext in ['.mp3', '.wav', '.m4a']:
            return "AUDIO"
        
        else:
            logger.warning(f"Unknown file type: {ext}, treating as TEXT")
            return "TEXT"
    
    def get_category_from_filename(self, file_name: str) -> str:
        """Guess category from filename"""
        name_lower = file_name.lower()
        
        if 'guideline' in name_lower or 'brand' in name_lower or 'style' in name_lower:
            return "BRAND_GUIDELINES"
        elif 'template' in name_lower or 'post' in name_lower:
            return "POST_TEMPLATES"
        elif 'feedback' in name_lower or 'review' in name_lower or 'comment' in name_lower:
            return "CUSTOMER_FEEDBACK"
        elif 'faq' in name_lower or 'question' in name_lower:
            return "FAQ"
        elif 'competitor' in name_lower or 'rival' in name_lower:
            return "COMPETITOR_ANALYSIS"
        elif 'image' in name_lower or 'photo' in name_lower or 'video' in name_lower:
            return "MEDIA_ASSETS"
        else:
            return "OTHER"
    
    def delete_file(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """Delete uploaded file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted file: {file_path}")
                return True, None
            else:
                return True, None  # Already deleted
        except Exception as e:
            error = f"File deletion error: {e}"
            logger.error(error)
            return False, error
