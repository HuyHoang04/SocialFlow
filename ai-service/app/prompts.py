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

# ==================== CONTENT GENERATION ====================
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

# ==================== CONTENT REWRITING ====================
CONTENT_REWRITE_PROMPT = """Rewrite the following content with a {tone} tone ({tone_description}).
Keep the original message and meaning intact, but adjust the style and language.

Original content:
{content}

Please provide ONLY the rewritten content, no explanations."""

# ==================== KEYWORD & HASHTAG OPTIMIZATION ====================
KEYWORD_OPTIMIZATION_PROMPT = """Analyze the following social media content and suggest relevant hashtags and keywords.
Platform: {platform}
Maximum hashtags: {max_hashtags}
Existing keywords: {existing_keywords}

Content:
{content}

Provide your response in this format:
HASHTAGS: #hashtag1, #hashtag2, #hashtag3
KEYWORDS: keyword1, keyword2, keyword3
TRENDING_TOPICS: topic1, topic2

Only provide the list items, no explanations."""

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
