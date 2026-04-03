# Utility functions for formatting
from typing import Dict, Any

def format_model_info(model_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Format model info with readable pricing (not scientific notation)"""
    formatted = model_dict.copy()
    
    # Convert scientific notation to decimal (e.g., 5.9e-07 → 0.00000059)
    if "input_cost" in formatted:
        formatted["input_cost"] = float(formatted["input_cost"])
        formatted["input_cost_display"] = f"${formatted['input_cost']*1_000_000:.2f}/1M tokens"
    
    if "output_cost" in formatted:
        formatted["output_cost"] = float(formatted["output_cost"])
        formatted["output_cost_display"] = f"${formatted['output_cost']*1_000_000:.2f}/1M tokens"
    
    return formatted
