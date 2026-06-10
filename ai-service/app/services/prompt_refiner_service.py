# app/services/prompt_refiner_service.py
from typing import Dict, Any, List

class PromptRefinerService:
    """Service to refine simple user inputs into rich, context-aware LLM prompts"""
    
    async def refine_caption_prompt(
        self,
        user_brief: str,
        platforms: List[str],
        category: str,
        tone: str,
        brand_context: Dict[str, Any],
        analytics_context: Dict[str, Any]
    ) -> str:
        """Takes simple user input and enhances it into a super prompt"""
        
        platforms_str = ", ".join(platforms) if platforms else "general social media"
        
        brand_name = brand_context.get("brand_name", "the brand")
        voice = brand_context.get("voice", tone)
        guardrails = brand_context.get("guardrails", "None")
        audience = analytics_context.get("target_audience", "general audience")
        golden_hour = analytics_context.get("golden_hour", "Any time")
        
        base_prompt = f"""
You are a social media copywriter for {brand_name}.
Create compelling {platforms_str} captions for a {category}.

Content Brief: {user_brief}

Marketing hooks to include:
- Attention-grabber in the first 10 words
- Key benefit or unique angle
- Emotional connection to the audience
- Clear call-to-action

Brand Guidelines:
- Brand voice: {voice}
- Content guardrails (AVOID): {guardrails}

Audience Insights:
- Target audience: {audience}
- Optimal posting time: {golden_hour}

Create 3 captions with different angles/hooks:
Angle 1: Benefit-focused (what the audience gains)
Angle 2: Emotional/Story-focused (how it makes them feel)
Angle 3: Urgency/FOMO-focused (why now)

Requirements:
- Platform-specific format (e.g. Twitter <280 chars, Instagram with hashtags)
- Include call-to-action
- Sound natural and on-brand

Return ONLY a JSON array with this exact structure:
[
  {{"caption": "...", "angle": "benefit", "platform": "...", "tone": "{tone}"}},
  {{"caption": "...", "angle": "emotional", "platform": "...", "tone": "{tone}"}},
  {{"caption": "...", "angle": "urgency", "platform": "...", "tone": "{tone}"}}
]
"""
        return base_prompt

    async def refine_enhance_prompt(self, current_caption: str, tone: str, brand_context: Dict[str, Any]) -> str:
        brand_name = brand_context.get("brand_name", "the brand")
        voice = brand_context.get("voice", tone)
        
        return f"""
You are a social media copywriter for {brand_name}.
Brand voice guidelines: {voice}

Rewrite this caption in a {tone} tone:
"{current_caption}"

Requirements:
- Maintain original message and core details
- Apply tone: {tone}
- Keep under typical platform limits
- Add emotional hook if possible
- Sound natural, not AI-written
- Align with brand voice: {voice}

Return ONLY the rewritten caption text, no explanation or preamble.
"""

    async def refine_hashtag_prompt(self, caption: str, platform: str, analytics: Dict[str, Any], max_count: int = 10) -> str:
        audience = analytics.get("target_audience", "general audience")
        
        return f"""
Topic: the caption below
Platform: {platform}
Target audience: {audience}

Generate exactly {max_count} hashtags for this content:
"{caption}"

Requirements:
- Mix: 40% trending (10K-1M), 40% niche (1K-100K), 20% specific (<1K)
- Relevant to content
- No generic hashtags (e.g. #instagood, #photooftheday)
- Format: #tag1 (volume) | #tag2 (volume) | ...

Return ONLY the pipe-separated list with estimated volumes. Example: #tag1 (120K) | #tag2 (45K)
"""

    async def refine_image_prompt(self, caption: str, style: str, aspect_ratio: str, brand_context: Dict[str, Any]) -> str:
        brand_name = brand_context.get("brand_name", "the brand")
        
        return f"""
Create a highly detailed image generation prompt for a {style} image.

Based on this content: "{caption}"
Brand context: {brand_name}
Style: {style}
Aspect Ratio: {aspect_ratio}

Technical requirements:
- High resolution, professional quality
- Visual composition details, lighting, mood
- NO text or words in the image

Return ONLY the image prompt string, no explanations.
"""
