# AI Prompts and Fine-Tuning Templates
# This file contains all prompt templates used for content generation and optimization

# ==================== TONE DESCRIPTIONS ====================
TONE_DESCRIPTIONS = {
    "professional": "formal business tone, remove emojis, use industry terms",
    "casual": "friendly conversational tone, can use emojis, relaxed language",
    "humorous": "funny and witty tone, include relevant jokes or puns",
    "inspirational": "motivational and uplifting tone, focus on positive message",
    "technical": "detailed and precise tone, include technical terms and specifics"
}

CONTENT_GENERATION_PROMPT = """You are an expert social media content creator.

Platform: {platform}
Tone: {tone}

Task: {prompt}

Requirements:
- Create engaging, authentic content
- Match the specified tone
- Optimized for {platform}
- Keep it concise and impactful
"""

# ==================== RAG CONTENT GENERATION ====================
RAG_CONTENT_GENERATION_PROMPT = """You are an expert social media content creator.

BRAND GUIDELINES & CONTEXT: {context}


Task: {prompt}

Requirements:
- Create engaging, authentic content
- Match the specified tone

- Keep it concise and impactful
"""

# ==================== CONTENT REWRITING ====================
CONTENT_REWRITE_PROMPT = """Rewrite the following content with a {tone} tone ({tone_description}).
Keep the original message and meaning intact, but adjust the style and language.

Original content:
{content}

INSTRUCTION: Output ONLY the rewritten content. Do not include any explanations, reasoning, or preamble. Just the rewritten text."""

# ==================== KEYWORD & HASHTAG OPTIMIZATION ====================
KEYWORD_OPTIMIZATION_PROMPT = """You are a social media keyword and hashtag optimization expert.

Analyze this content and suggest relevant hashtags and keywords.
Platform: {platform}
Maximum hashtags: {max_hashtags}
Existing keywords: {existing_keywords}

Content to analyze:
{content}

IMPORTANT INSTRUCTIONS:
1. Extract 3-5 most relevant keywords from the content
2. Suggest {max_hashtags} popular hashtags for this platform
3. Identify 2-3 trending topics related to this content
4. Format your response EXACTLY like this with no other text:

HASHTAGS: #keyword1, #keyword2, #keyword3, #keyword4, #keyword5
KEYWORDS: relevant, keyword, phrases, for, content
TRENDING_TOPICS: trending, topic, area

Do NOT include any explanations, reasoning, or preamble. Output only the three lines above."""

# ==================== VALID TONE VALUES ====================
VALID_TONES = ["professional", "casual", "humorous", "inspirational", "technical"]

# ==================== PROMPT UTILITIES ====================

def get_tone_description(tone: str) -> str:
    """Get description for a tone"""
    return TONE_DESCRIPTIONS.get(tone.lower(), "")

def is_valid_tone(tone: str) -> bool:
    """Check if tone is valid"""
    return tone.lower() in VALID_TONES

def format_rewrite_prompt(content: str, tone: str) -> str:
    """Format rewrite prompt with content and tone"""
    tone_lower = tone.lower()
    return CONTENT_REWRITE_PROMPT.format(
        tone=tone_lower,
        tone_description=get_tone_description(tone_lower),
        content=content
    )

def format_optimization_prompt(content: str, platform: str, keywords: list = None, max_hashtags: int = 10) -> str:
    """Format keyword optimization prompt"""
    existing_keywords = ", ".join(keywords) if keywords else "None provided"
    return KEYWORD_OPTIMIZATION_PROMPT.format(
        platform=platform,
        max_hashtags=max_hashtags,
        existing_keywords=existing_keywords,
        content=content
    )

def format_content_generation_prompt(prompt: str, platform: str, tone: str) -> str:
    """Format content generation prompt"""
    return CONTENT_GENERATION_PROMPT.format(
        platform=platform,
        tone=tone,
        prompt=prompt
    )

def format_rag_generation_prompt(prompt: str, context: str) -> str:
    """Format RAG content generation prompt with brand context"""
    return RAG_CONTENT_GENERATION_PROMPT.format(
        prompt=prompt,
        context=context
    )
