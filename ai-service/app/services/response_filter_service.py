# app/services/response_filter_service.py
import re
import json
from typing import List, Dict, Any

class ResponseFilterService:
    """Service to clean AI responses, remove reasoning, and extract structured data"""

    def filter_caption_response(self, raw_response: str) -> List[Dict[str, Any]]:
        """Extract JSON captions from response, ignore reasoning"""
        # Try to find JSON block
        json_match = re.search(r'\[\s*\{.*?\}\s*\]', raw_response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                if isinstance(data, list) and len(data) > 0 and 'caption' in data[0]:
                    return data
            except json.JSONDecodeError:
                pass
                
        # Fallback: if AI failed to return JSON, try to extract manually or return a default structure
        return [{"caption": self.filter_enhance_response(raw_response), "angle": "standard", "platform": "general", "tone": "standard"}]

    def filter_hashtag_response(self, raw_response: str) -> str:
        """Extract hashtags only, remove explanation"""
        # We asked for a pipe-separated list. Try to find it.
        lines = raw_response.split('\n')
        for line in lines:
            if '#' in line and '|' in line:
                return line.strip()
        
        # Fallback: find all hashtags
        hashtags = re.findall(r'#\w+', raw_response)
        if hashtags:
            return " ".join(hashtags)
            
        return raw_response.strip()

    def filter_enhance_response(self, raw_response: str) -> str:
        """Get final enhanced caption, strip thinking"""
        # Sometimes AI uses <think> tags or says "Here is the rewritten caption:"
        cleaned = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL)
        
        # Remove common preambles
        lines = cleaned.split('\n')
        result_lines = []
        skip = False
        for line in lines:
            lower_line = line.lower()
            if any(marker in lower_line for marker in ["here is", "sure", "rewritten:", "output:", "caption:"]):
                continue
            result_lines.append(line)
            
        final_text = "\n".join(result_lines).strip()
        # Remove quotes if the AI wrapped it in quotes
        if final_text.startswith('"') and final_text.endswith('"'):
            final_text = final_text[1:-1]
            
        return final_text.strip()

    def filter_image_prompt_response(self, raw_response: str) -> str:
        """Extract image prompt, remove planning steps"""
        # Similar logic to enhance, just strip out <think> and conversational filler
        cleaned = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL)
        
        lines = cleaned.split('\n')
        result_lines = []
        for line in lines:
            lower_line = line.lower()
            if any(marker in lower_line for marker in ["here is", "sure", "prompt:", "output:"]):
                continue
            result_lines.append(line)
            
        return "\n".join(result_lines).strip()
