# AI Service - Business logic layer
import asyncio
from typing import Dict, Any, Optional
from app.config import (
    DEFAULT_GROQ_MODEL, 
    DEFAULT_OPENROUTER_MODEL, 
    FALLBACK_OPENROUTER_MODEL,
    DEFAULT_IMAGE_MODEL,
    DEFAULT_IMAGE_PROVIDER,
    ENABLE_FALLBACK,
    ENABLE_IMAGE_FALLBACK,
)
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.providers.pixazo_provider import PixazoProvider
from app.utils.logger import setup_logger
from app.utils.formatting import format_model_info
from app.prompts import (
    VALID_TONES,
    get_tone_description,
    format_rewrite_prompt,
    format_optimization_prompt,
    format_content_generation_prompt,
)
from app.services.brand_context_service import BrandContextService
from app.services.prompt_refiner_service import PromptRefinerService
from app.services.response_filter_service import ResponseFilterService

logger = setup_logger(__name__)

class AIService:
    """Business logic for AI content generation"""
    
    def __init__(self):
        self.groq_provider = GroqProvider()
        self.openrouter_provider = OpenRouterProvider()
        self.pixazo_provider = PixazoProvider()
        self.brand_context = BrandContextService()
        self.prompt_refiner = PromptRefinerService()
        self.response_filter = ResponseFilterService()
    
    async def refresh_models(self):
        """Refresh model lists from all providers (text and image)"""
        logger.info("Refreshing model lists from all providers...")
        await asyncio.gather(
            self.groq_provider.fetch_models(),
            self.openrouter_provider.fetch_models(),
            self.openrouter_provider.fetch_image_models(),
            self.pixazo_provider.fetch_models(),
            return_exceptions=True
        )
        logger.info("Model refresh complete")
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get all available models with formatted pricing"""
        groq_models = self.groq_provider.models_cache or self.groq_provider.hardcoded_models
        openrouter_models = self.openrouter_provider.models_cache or self.openrouter_provider.hardcoded_models
        
        return {
            "groq": {
                model_id: format_model_info(model_info)
                for model_id, model_info in groq_models.items()
            },
            "openrouter": {
                model_id: format_model_info(model_info)
                for model_id, model_info in openrouter_models.items()
            }
        }
    
    async def generate_content(
        self,
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        max_words: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate content with specified provider and model
        Falls back to free OpenRouter model if primary fails
        max_words: approximate word count (1 token ≈ 0.75 words)
        """
        
        # Set defaults
        if provider is None:
            provider = "openrouter"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Convert words to tokens (approximately: 1 word ≈ 1.33 tokens)
        if max_words is None:
            max_words = 150
        max_tokens = max(int(max_words * 1.33), 13)  # minimum 13 tokens for Groq
        
        # Generate with specified provider
        if provider == "groq":
            try:
                result = await self.groq_provider.generate(prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                # Rename token_count to tokens for API response consistency
                if "token_count" in result_dict:
                    result_dict["tokens"] = result_dict.pop("token_count")
                return result_dict
            except Exception as groq_error:
                if not ENABLE_FALLBACK:
                    logger.error(f"Groq failed, fallback disabled: {groq_error}")
                    return {
                        "content": "I apologize, but I'm unable to generate content right now.",
                        "provider": "none",
                        "model": model,
                        "cost": 0,
                        "tokens": 0,
                        "success": False,
                        "error": f"Groq generation failed (fallback disabled): {str(groq_error)}"
                    }
                
                logger.warning(f"Groq failed, trying fallback to OpenRouter...")
                try:
                    result = await self.openrouter_provider.generate(prompt, FALLBACK_OPENROUTER_MODEL, max_tokens)
                    result_dict = result.dict() if hasattr(result, 'dict') else result
                    # Rename token_count to tokens for API response consistency
                    if "token_count" in result_dict:
                        result_dict["tokens"] = result_dict.pop("token_count")
                    return result_dict
                except Exception as fallback_error:
                    logger.error(f"Both providers failed")
                    return {
                        "content": "I apologize, but I'm unable to generate content right now.",
                        "provider": "none",
                        "model": None,
                        "cost": 0,
                        "tokens": 0,
                        "success": False,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate(prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                # Rename token_count to tokens for API response consistency
                if "token_count" in result_dict:
                    result_dict["tokens"] = result_dict.pop("token_count")
                return result_dict
            except Exception as e:
                logger.error(f"OpenRouter failed: {e}")
                return {
                    "content": "I apologize, but I'm unable to generate content right now.",
                    "provider": "none",
                    "model": model,
                    "cost": 0,
                    "tokens": 0,
                    "success": False,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "content": "Invalid provider. Use 'groq' or 'openrouter'.",
                "provider": "none",
                "cost": 0,
                "tokens": 0,
                "success": False,
                "error": f"Unknown provider: {provider}"
            }
            
    async def generate_caption_batch(
        self,
        brand_id: str,
        platforms: list,
        category: str,
        tone: str,
        user_brief: str,
        scheduled_time: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        use_rag: bool = False
    ) -> list:
        """3-step pipeline: Form -> Refine -> Generate -> Filter"""
        # Step 1: Context & Refine
        brand_ctx = await self.brand_context.build_context_with_analytics(brand_id, scheduled_time)
        
        # Incorporate RAG context if requested
        if use_rag:
            try:
                from app.services.rag_service import RagService
                rag_service = RagService()
                rag_results = await rag_service.search_similar_chunks(
                    brand_id=brand_id,
                    query_text=user_brief,
                    limit=3,
                    threshold=0.3,
                    provider=provider,
                    model=model
                )
                if rag_results:
                    rag_text = "\n\n".join([f"- {r.get('text', '')}" for r in rag_results])
                    brand_ctx += f"\n\n[Brand Content Library Guidelines / Reference Data]:\n{rag_text}"
                    logger.info(f"RAG context successfully injected for batch generation (found {len(rag_results)} chunks)")
            except Exception as e:
                logger.error(f"Failed to inject RAG context for batch generation: {e}")

        refined_prompt = await self.prompt_refiner.refine_caption_prompt(
            user_brief=user_brief,
            platforms=platforms,
            category=category,
            tone=tone,
            brand_context=brand_ctx,
            analytics_context=brand_ctx # brand_ctx has golden_hour/audience
        )
        
        # Step 2: Generate
        if provider is None: provider = "groq"
        if model is None: model = DEFAULT_GROQ_MODEL
        
        raw_result = await self.generate_content(prompt=refined_prompt, provider=provider, model=model, max_words=300)
        
        if not raw_result["success"]:
            raise Exception(f"Generation failed: {raw_result['error']}")
            
        # Step 3: Filter
        clean_captions = self.response_filter.filter_caption_response(raw_result["content"])
        return clean_captions
    
    async def rewrite_content(
        self,
        content: str,
        tone: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        max_words: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Rewrite content with specified tone
        Supported tones: professional, casual, humorous, inspirational, technical
        max_words: approximate word count (1 token ≈ 0.75 words)
        """
        tone_lower = tone.lower()
        
        if tone_lower not in VALID_TONES:
            return {
                "original_content": content,
                "rewritten_content": content,
                "tone_applied": tone,
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Invalid tone. Use one of: {', '.join(VALID_TONES)}"
            }
        
        brand_id = "default" # We need to pass brand_id down or get it from context. Assuming it might be added.
        # But for now, rewrite_prompt is already formatted. 
        # Actually, let's use the new refiner and filter:
        # We need brand_context. For now, since brand_id is not passed to rewrite_content currently,
        # we will just use the filter for clean output.
        # Build rewrite prompt using formatter
        rewrite_prompt = format_rewrite_prompt(content, tone_lower)
        
        # Set defaults
        if provider is None:
            provider = "groq"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Convert words to tokens (approximately: 1 word ≈ 1.33 tokens)
        if max_words is None:
            max_words = 150
        max_tokens = max(int(max_words * 1.33), 13)  # minimum 13 tokens for Groq
        
        # Rewrite with specified provider
        if provider == "groq":
            try:
                result = await self.groq_provider.generate(rewrite_prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                # Rename token_count to tokens for API response consistency
                tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                # Extract clean rewritten content (handles verbose AI responses)
                clean_content = self.response_filter.filter_enhance_response(result_dict["content"])
                return {
                    "original_content": content,
                    "rewritten_content": clean_content,
                    "tone_applied": tone_lower,
                    "provider": result_dict["provider"],
                    "model": result_dict.get("model"),
                    "cost": result_dict["cost"],
                    "tokens": tokens,
                    "success": result_dict["success"],
                    "error": result_dict.get("error")
                }
            except Exception as groq_error:
                if not ENABLE_FALLBACK:
                    logger.error(f"Groq rewrite failed, fallback disabled: {groq_error}")
                    return {
                        "original_content": content,
                        "rewritten_content": content,
                        "tone_applied": tone_lower,
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Groq rewrite failed (fallback disabled): {str(groq_error)}"
                    }
                
                logger.warning(f"Groq rewrite failed, trying fallback...")
                try:
                    result = await self.openrouter_provider.generate(rewrite_prompt, FALLBACK_OPENROUTER_MODEL, max_tokens)
                    result_dict = result.dict() if hasattr(result, 'dict') else result
                    # Rename token_count to tokens for API response consistency
                    tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                    # Extract clean rewritten content (handles verbose AI responses)
                    clean_content = self.response_filter.filter_enhance_response(result_dict["content"])
                    return {
                        "original_content": content,
                        "rewritten_content": clean_content,
                        "tone_applied": tone_lower,
                        "provider": result_dict["provider"],
                        "model": result_dict.get("model"),
                        "cost": result_dict["cost"],
                        "tokens": tokens,
                        "success": result_dict["success"],
                        "error": result_dict.get("error")
                    }
                except Exception as fallback_error:
                    return {
                        "original_content": content,
                        "rewritten_content": content,
                        "tone_applied": tone_lower,
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate(rewrite_prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                # Rename token_count to tokens for API response consistency
                tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                # Extract clean rewritten content (handles verbose AI responses)
                clean_content = self.response_filter.filter_enhance_response(result_dict["content"])
                return {
                    "original_content": content,
                    "rewritten_content": clean_content,
                    "tone_applied": tone_lower,
                    "provider": result_dict["provider"],
                    "model": result_dict.get("model"),
                    "cost": result_dict["cost"],
                    "tokens": tokens,
                    "success": result_dict["success"],
                    "error": result_dict.get("error")
                }
            except Exception as e:
                return {
                    "original_content": content,
                    "rewritten_content": content,
                    "tone_applied": tone_lower,
                    "provider": "none",
                    "success": False,
                    "cost": 0,
                    "tokens": 0,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "original_content": content,
                "rewritten_content": content,
                "tone_applied": tone_lower,
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Unknown provider: {provider}"
            }
    
    async def optimize_keywords(
        self,
        content: str,
        keywords: Optional[list] = None,
        platform: str = "general",
        max_hashtags: int = 10,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        max_words: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Suggest relevant hashtags and keywords for content
        max_words: approximate word count (1 token ≈ 0.75 words)
        """
        
        # Build optimization prompt using formatter
        optimization_prompt = format_optimization_prompt(content, platform, keywords, max_hashtags)
        
        # Set defaults
        if provider is None:
            provider = "groq"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Convert words to tokens (approximately: 1 word ≈ 1.33 tokens)
        if max_words is None:
            max_words = 150
        max_tokens = max(int(max_words * 1.33), 13)  # minimum 13 tokens for Groq
        
        # Generate with specified provider
        if provider == "groq":
            try:
                result = await self.groq_provider.generate(optimization_prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                hashtags, keywords_list, topics = self._parse_optimization_response(result_dict["content"])
                
                # Check if parsing returned placeholder values (keyword1, keyword2, etc.)
                is_placeholder = any('keyword' in str(kw).lower() or 'hashtag' in str(h).lower() or 'topic' in str(t).lower() 
                                    for kw in keywords_list for h in hashtags for t in topics)
                
                if not hashtags or not keywords_list or is_placeholder:
                    logger.warning(f"AI returned placeholder values, using fallback extraction")
                    hashtags, keywords_list, topics = self._extract_fallback_keywords(content, keywords)
                
                # Rename token_count to tokens for API response consistency
                tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                return {
                    "hashtags": hashtags[:max_hashtags],
                    "keywords": keywords_list,
                    "trending_topics": topics,
                    "provider": result_dict["provider"],
                    "model": result_dict.get("model"),
                    "cost": result_dict["cost"],
                    "tokens": tokens,
                    "success": result_dict["success"],
                    "error": result_dict.get("error")
                }
            except Exception as groq_error:
                if not ENABLE_FALLBACK:
                    logger.error(f"Groq keyword optimization failed, fallback disabled: {groq_error}")
                    return {
                        "hashtags": [],
                        "keywords": keywords or [],
                        "trending_topics": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Groq keyword optimization failed (fallback disabled): {str(groq_error)}"
                    }
                
                logger.warning(f"Groq keyword optimization failed, trying fallback...")
                try:
                    result = await self.openrouter_provider.generate(optimization_prompt, FALLBACK_OPENROUTER_MODEL, max_tokens)
                    result_dict = result.dict() if hasattr(result, 'dict') else result
                    hashtags, keywords_list, topics = self._parse_optimization_response(result_dict["content"])
                    
                    # Check if parsing returned placeholder values
                    is_placeholder = any('keyword' in str(kw).lower() or 'hashtag' in str(h).lower() or 'topic' in str(t).lower() 
                                        for kw in keywords_list for h in hashtags for t in topics)
                    
                    if not hashtags or not keywords_list or is_placeholder:
                        logger.warning(f"AI returned placeholder values, using fallback extraction")
                        hashtags, keywords_list, topics = self._extract_fallback_keywords(content, keywords)
                    
                    # Rename token_count to tokens for API response consistency
                    tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                    return {
                        "hashtags": hashtags[:max_hashtags],
                        "keywords": keywords_list,
                        "trending_topics": topics,
                        "provider": result_dict["provider"],
                        "model": result_dict.get("model"),
                        "cost": result_dict["cost"],
                        "tokens": tokens,
                        "success": result_dict["success"],
                        "error": result_dict.get("error")
                    }
                except Exception as fallback_error:
                    return {
                        "hashtags": [],
                        "keywords": keywords or [],
                        "trending_topics": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate(optimization_prompt, model, max_tokens)
                result_dict = result.dict() if hasattr(result, 'dict') else result
                hashtags, keywords_list, topics = self._parse_optimization_response(result_dict["content"])
                
                # Check if parsing returned placeholder values
                is_placeholder = any('keyword' in str(kw).lower() or 'hashtag' in str(h).lower() or 'topic' in str(t).lower() 
                                    for kw in keywords_list for h in hashtags for t in topics)
                
                if not hashtags or not keywords_list or is_placeholder:
                    logger.warning(f"AI returned placeholder values, using fallback extraction")
                    hashtags, keywords_list, topics = self._extract_fallback_keywords(content, keywords)
                
                # Rename token_count to tokens for API response consistency
                tokens = result_dict.pop("token_count", result_dict.get("tokens", 0))
                return {
                    "hashtags": hashtags[:max_hashtags],
                    "keywords": keywords_list,
                    "trending_topics": topics,
                    "provider": result_dict["provider"],
                    "model": result_dict.get("model"),
                    "cost": result_dict["cost"],
                    "tokens": tokens,
                    "success": result_dict["success"],
                    "error": result_dict.get("error")
                }
            except Exception as e:
                return {
                    "hashtags": [],
                    "keywords": keywords or [],
                    "trending_topics": [],
                    "provider": "none",
                    "success": False,
                    "cost": 0,
                    "tokens": 0,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "hashtags": [],
                "keywords": keywords or [],
                "trending_topics": [],
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Unknown provider: {provider}"
            }
    
    def _parse_optimization_response(self, response: str) -> tuple:
        """Parse AI response to extract hashtags, keywords, and topics"""
        import re
        
        hashtags = []
        keywords_list = []
        topics = []
        
        if not response or not response.strip():
            return hashtags, keywords_list, topics
        
        # Split by lines and process
        lines = response.split('\n')
        
        current_section = None
        section_data = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect section headers (case-insensitive)
            line_upper = line.upper()
            
            if re.search(r'^HASHTAGS?:', line_upper):
                # Extract data after the colon
                match = re.search(r'^HASHTAGS?:\s*(.*)', line, re.IGNORECASE)
                if match:
                    section_data = match.group(1).strip()
                    hashtags = [tag.strip() for tag in section_data.split(',') if tag.strip()]
                    # Clean up hashtags - remove extra text after common delimiters
                    hashtags = [re.sub(r'\s+.*$', '', tag) for tag in hashtags]
                    hashtags = [f"#{tag.lstrip('#')}" for tag in hashtags if tag]
                current_section = None
                
            elif re.search(r'^KEYWORDS?:', line_upper):
                # Extract data after the colon
                match = re.search(r'^KEYWORDS?:\s*(.*)', line, re.IGNORECASE)
                if match:
                    section_data = match.group(1).strip()
                    keywords_list = [kw.strip() for kw in section_data.split(',') if kw.strip()]
                    # Clean up keywords - remove extra text after common delimiters
                    keywords_list = [re.sub(r'\s+(?:BUT|ALSO|SAID|MAYBE|PERHAPS|OR|AND).*$', '', kw, flags=re.IGNORECASE) for kw in keywords_list]
                    keywords_list = [kw.strip() for kw in keywords_list if kw.strip()]
                current_section = None
                
            elif re.search(r'^TRENDING[_\s]TOPICS?:', line_upper):
                # Extract data after the colon
                match = re.search(r'^TRENDING[_\s]TOPICS?:\s*(.*)', line, re.IGNORECASE)
                if match:
                    section_data = match.group(1).strip()
                    topics = [t.strip() for t in section_data.split(',') if t.strip()]
                    # Clean up topics - remove extra text and punctuation
                    topics = [re.sub(r'\s+(?:BUT|ALSO|SAID|MAYBE|PERHAPS).*$', '', t, flags=re.IGNORECASE) for t in topics]
                    topics = [re.sub(r'^[.,\s]+', '', t) for t in topics]  # Remove leading punctuation
                    topics = [t.strip() for t in topics if t.strip() and len(t.strip()) > 1]
                current_section = None
        
        return hashtags, keywords_list, topics
    
    def _extract_fallback_keywords(self, content: str, existing_keywords: list = None) -> tuple:
        """
        Fallback method to extract keywords from content when AI parsing fails.
        Uses simple NLP heuristics: nouns, compound nouns, and important words.
        """
        import re
        
        # Clean content
        words = re.findall(r'\b[a-z]+\b', content.lower())
        
        # Common stopwords to exclude
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                     'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                     'should', 'may', 'might', 'must', 'can', 'shall', 'if', 'or', 'and',
                     'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
                     'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
                     'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'}
        
        # Extract meaningful words
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        
        # Count word frequency
        from collections import Counter
        freq = Counter(keywords)
        
        # Get top keywords
        top_keywords = [word for word, _ in freq.most_common(5)]
        
        # Add existing keywords if provided
        if existing_keywords:
            top_keywords = list(dict.fromkeys(existing_keywords + top_keywords))[:5]
        
        # Generate hashtags from keywords
        hashtags = [f"#{kw.title()}" for kw in top_keywords[:3]]
        
        # Generate trending topics (similar to keywords but broader)
        topics = [word.title() for word in top_keywords[2:4]]
        
        return hashtags, top_keywords, topics
    
    async def generate_image(
        self,
        prompt: str,
        style: Optional[str] = None,
        platform: str = "general",
        width: int = 1024,
        height: int = 1024,
        count: int = 1,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate images using Pixazo (FREE) or OpenRouter (fallback)
        Priority: Pixazo (free) → OpenRouter (paid fallback)
        """
        
        # Set defaults
        if provider is None:
            provider = DEFAULT_IMAGE_PROVIDER  # "pixazo"
        if provider == "pixazo" and model is None:
            model = DEFAULT_IMAGE_MODEL
        
        logger.info(f"Image generation request: {prompt[:50]}... | Provider: {provider}")
        
        # Try Pixazo (PRIMARY - FREE)
        if provider == "pixazo":
            try:
                result = await self.pixazo_provider.generate_image(
                    prompt=prompt,
                    model=model,
                    style=style,
                    width=width,
                    height=height,
                    count=count
                )
                # Convert to dict if it's a Pydantic model
                return result.dict() if hasattr(result, 'dict') else result
            except Exception as e:
                if not ENABLE_IMAGE_FALLBACK:
                    logger.error(f"Pixazo failed, fallback disabled: {e}")
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Pixazo generation failed (fallback disabled): {str(e)}"
                    }
                
                logger.warning(f"Pixazo generation failed: {e}, trying OpenRouter fallback...")
                # Fallback to OpenRouter
                try:
                    result = await self.openrouter_provider.generate_image(
                        prompt=prompt,
                        style=style,
                        model=model,
                        count=count
                    )
                    result_dict = result.dict() if hasattr(result, 'dict') else result
                    logger.info(f"Used OpenRouter fallback (cost: ${result_dict.get('cost', 0):.6f})")
                    return result_dict
                except Exception as fallback_error:
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Both Pixazo (free) and OpenRouter (fallback) failed: {str(e)} | {str(fallback_error)}"
                    }
        
        # OpenRouter as primary (user explicitly chose)
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate_image(
                    prompt=prompt,
                    style=style,
                    model=model,
                    count=count
                )
                result_dict = result.dict() if hasattr(result, 'dict') else result
                logger.info(f"Used OpenRouter | Cost: ${result_dict.get('cost', 0):.6f}")
                return result_dict
            except Exception as e:
                logger.error(f"OpenRouter image generation failed: {e}")
                
                if not ENABLE_IMAGE_FALLBACK:
                    logger.error(f"OpenRouter failed, fallback disabled")
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"OpenRouter generation failed (fallback disabled): {str(e)}"
                    }
                
                # Try Pixazo as emergency fallback
                try:
                    logger.warning(f"OpenRouter failed, trying Pixazo emergency fallback...")
                    result = await self.pixazo_provider.generate_image(
                        prompt=prompt,
                        style=style,
                        width=width,
                        height=height,
                        count=count
                    )
                    result_dict = result.dict() if hasattr(result, 'dict') else result
                    logger.info(f"Used Pixazo emergency fallback (FREE)")
                    return result_dict
                except Exception as fallback_error:
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Both providers failed: {str(e)} | {str(fallback_error)}"
                    }
        
        else:
            return {
                "images": [],
                "provider": "none",
                "success": False,
                "cost": 0,
                "image_count": 0,
                "error": f"Unknown image provider: {provider}"
            }
    
    def get_available_image_models(self) -> Dict[str, Any]:
        """Get all available image models from both providers (dynamically fetched)"""
        pixazo_models = self.pixazo_provider.models_cache or {}
        openrouter_models = self.openrouter_provider.image_models_cache or {}
        
        return {
            "pixazo": pixazo_models,
            "openrouter": openrouter_models
        }
    
    def _extract_rewritten_content(self, ai_response: str, original_content: str) -> str:
        """
        Extract clean rewritten content from AI response.
        Sometimes AI includes reasoning/thinking in the response.
        This tries to extract just the actual rewritten content.
        """
        if not ai_response:
            return original_content
        
        # If response is roughly similar length to original, it's probably the rewrite (not reasoning)
        if len(ai_response) < len(original_content) * 5:  # Allow up to 5x for expansion
            return ai_response.strip()
        
        # If response is too long, look for the actual rewrite by extracting after reasoning markers
        lines = ai_response.split('\n')
        
        # Look for common ending markers that signal actual output after reasoning
        for i, line in enumerate(lines):
            lower = line.lower()
            if any(marker in lower for marker in ['possible rewrites:', 'rewrite:', 'output:', 'revised:']):
                # Return content after this marker
                remaining = '\n'.join(lines[i+1:]).strip()
                if remaining and len(remaining) < len(original_content) * 5:
                    return remaining
        
        # If no markers found, try to get the shortest meaningful paragraph
        # Split by double newlines or take the shortest paragraph
        paragraphs = [p.strip() for p in ai_response.split('\n\n') if p.strip()]
        
        # Find shortest paragraph that's not just the original
        for para in sorted(paragraphs, key=len):
            if para and len(para) > len(original_content) * 0.5 and len(para) < len(original_content) * 5:
                return para
        
        # Fallback: return first sentence or short paragraph
        return ai_response.strip().split('\n')[0] if ai_response.strip() else original_content
