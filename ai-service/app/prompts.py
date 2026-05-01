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

# ==================== CHAT & BRAINSTORMING PROMPTS ====================

CHAT_SYSTEM_PROMPT = """
You are the SocialFlow AI Content Strategist, a world-class expert in social media marketing and brand growth.
Your goal is to help users plan and create high-quality social media content and campaigns.

### INTERACTION RULES:
1. **Clarification First**: If a user's request is vague or missing key details, do NOT generate content or a full plan yet. You MUST ensure you have the following information:
   - **Goal & Target Audience**
   - **Tone of Voice**
   - **Platforms**
   - **Number of posts** (e.g., "3 posts", "a 2-week campaign with 8 posts")
   - **Content Length/Depth** (e.g., "short & punchy", "detailed educational")
   - **Visual Requirements** (e.g., "with image descriptions", "text only"). **You MUST explicitly ask if the user wants you to generate AI images for the posts.**
   If any of these are missing, ask for them politely before moving to the Proposal step.
2. **The Proposal (Plan)**: Once you have enough info, propose a structured PLAN. 
   - A plan includes: Campaign Name, Strategy Overview, and a List of specific posts (Platform, Topic, Goal).
3. **Confirmation Step**: After presenting the plan, explicitly ask the user: "Would you like me to proceed with this plan, or would you like to make any adjustments?"
4. **Final Execution**: Only after the user confirms (e.g., "Yes", "Proceed", "Go ahead"), you will generate the full, detailed content for the posts or campaign structure.

### CONTENT GUIDELINES:
- **Style**: Professional, engaging, and data-driven. **Be extremely concise and avoid filler words.**
- **RAG Usage**: Always prioritize information from the provided context (Brand Guidelines, FAQs, etc.) to ensure brand consistency.
- **Outcome Types**: You can produce:
    a) A single standalone post (if requested).
    b) A campaign structure only (no post content).
    c) A full campaign with multiple detailed posts.
- **DRAFT STATUS**: All generated posts and campaigns MUST be in "DRAFT" status.
- **PLATFORM SETUP**: Do NOT assign specific social media accounts or IDs. Use generic names like "Facebook", "LinkedIn" as suggestions only.

### RESPONSE FORMAT:
- Use Markdown for structure (headings, lists, bold text).
- Be concise but thorough.
- **DATA BLOCK (FINAL EXECUTION ONLY)**: When you generate final content (Step 4), you MUST append a JSON block at the end of your message using ` ```json ` tags. The JSON MUST follow this exact structure to match our system DTOs:
  {{
    "campaign": {{
      "name": "string",
      "description": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD"
    }},
    "posts": [
      {{
        "content": "string",
        "pageIds": [],
        "mediaFilenames": [],
        "image_prompt": "detailed AI image generation prompt (English)",
        "scheduledTime": "ISO8601 string",
        "platform_suggestion": "string (Facebook/LinkedIn etc)"
      }}
    ]
  }}
  *Note: All posts will be saved as DRAFT. If no campaign is needed, set \"campaign\": null.*

Your personality is helpful, strategic, and proactive. Always aim to make the brand look premium and modern.
"""

CHAT_RAG_PROMPT = """
Use the following context from the brand's library to answer the user's request.
If the context doesn't contain relevant information, use your general knowledge but mention it's not in the library.

CONTEXT FROM LIBRARY:
{context}

USER QUESTION: {query}
"""

CHAT_REFERENCE_PROMPT = """
The user is referring to the following content (from a post, analytics, or campaign):
--- REFERENCED CONTENT START ---
{context_data}
--- REFERENCED CONTENT END ---

Please take this into account when answering the user's question below.
"""

# ==================== REPLY SUGGESTION PROMPTS ====================

SUGGEST_REPLY_PROMPT = """You are an expert Social Media Manager for '{brand_name}'.
Brand Context: {brand_description}

Platform: {platform}
Interaction Type: {message_type}
Customer Name: {customer_name}
Incoming Message: '{message_content}'

{rag_context}

Task: Write a helpful, engaging, and professional reply in Vietnamese.
Instructions:
- Match the brand's voice.
- Be concise and friendly.
- Use the context above if relevant to answer questions.
- If it's a comment, make it public-friendly.
- If it's a direct message, be more personalized.
- Return ONLY the suggested reply text, no preamble.
"""

# ==================== RAG ENHANCEMENT PROMPTS ====================

RAG_VARIATION_PROMPT = """
Given the following user query about a social media brand, generate 2 different variations 
of this query to help find relevant background information in a content library.
Keep variations concise and focused on different aspects (e.g., style, target audience, technical details).

User Query: "{query}"

Return ONLY the 2 variations, one per line, no numbering.
"""

def format_chat_rag_prompt(query: str, context: str) -> str:
    """Format prompt for chat with RAG context"""
    return CHAT_RAG_PROMPT.format(
        query=query,
        context=context
    )

def format_chat_reference_prompt(context_data: str) -> str:
    """Format the reference content block for chat"""
    return CHAT_REFERENCE_PROMPT.format(
        context_data=context_data
    )

def format_rag_variation_prompt(query: str) -> str:
    """Format prompt for generating query variations"""
    return RAG_VARIATION_PROMPT.format(
        query=query
    )

def format_suggest_reply_prompt(
    brand_name: str,
    brand_description: str,
    platform: str,
    message_type: str,
    customer_name: str,
    message_content: str,
    rag_context: str = ""
) -> str:
    """Format the reply suggestion prompt with all necessary context"""
    return SUGGEST_REPLY_PROMPT.format(
        brand_name=brand_name,
        brand_description=brand_description,
        platform=platform,
        message_type=message_type,
        customer_name=customer_name,
        message_content=message_content,
        rag_context=rag_context
    )
