#!/usr/bin/env python3
"""
D&D Stat Block Parser using TinyLlama
Parses unstructured D&D 5e stat blocks and outputs structured JSON for database insertion
"""

import json
import re
from pathlib import Path
from typing import Dict, Optional, List, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def clean_json_string(json_str: str) -> str:
    """
    Clean up common JSON issues that LLMs produce:
    - Remove trailing commas in arrays and objects
    - Fix other common formatting issues
    
    Args:
        json_str: Potentially malformed JSON string from LLM
        
    Returns:
        Cleaned JSON string safe for json.loads()
    """
    # Remove trailing commas before closing brackets/braces
    # Match pattern: comma followed by } or ]
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
    
    return json_str

try:
    from llama_cpp import Llama
    LLAMA_AVAILABLE = True
except ImportError:
    LLAMA_AVAILABLE = False
    logger.warning("llama-cpp-python not installed. Install with: pip install llama-cpp-python")


class StatBlockParser:
    """Parser for D&D 5e stat blocks using local LLM"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the parser with a local model.
        
        Args:
            model_path: Path to GGUF model. Defaults to models/mistral.gguf in workspace root.
        """
        if not LLAMA_AVAILABLE:
            raise RuntimeError("llama-cpp-python is not installed. Run: pip install llama-cpp-python")
        
        if model_path is None:
            # Default to models directory in workspace root
            workspace_root = Path(__file__).parent.parent
            # Try various model names
            model_candidates = [
                workspace_root / "models" / "mistral.gguf",
                workspace_root / "models" / "mistral-7b-instruct-v0.1.Q4_K_M.gguf",
                workspace_root / "models" / "tinyllama.gguf",
                workspace_root / "models" / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
            ]
            
            model_path = None
            for candidate in model_candidates:
                if candidate.exists():
                    model_path = candidate
                    logger.info(f"Found model: {candidate.name}")
                    break
            
            if model_path is None:
                raise FileNotFoundError(
                    f"No model found in models/ directory.\n"
                    "Download Mistral 7B from: "
                    "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF\n"
                    "Or TinyLlama from: "
                    "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF"
                )
        
        self.model_path = Path(model_path)
        
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {self.model_path}\n"
                "Download Mistral 7B from: "
                "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF"
            )
        
        logger.info(f"Loading model from {self.model_path}")
        self.model = Llama(
            model_path=str(self.model_path),
            n_ctx=32768,  # Use full model capacity (Mistral trained on 32768)
            n_threads=8,  # Use more CPU threads for better performance
            verbose=False
        )
        logger.info("Model loaded successfully (CPU mode)")
    
    def parse(self, stat_block_text: str) -> Dict:
        """
        Parse a D&D 5e stat block and return structured JSON.
        
        Args:
            stat_block_text: Raw stat block text (e.g., from Monster Manual)
            
        Returns:
            Dictionary with parsed creature data ready for database insertion
        """
        
        prompt = f"""[INST] You are a D&D 5e stat block parser. Extract ALL creature data including EVERY attack and damage roll.

STAT BLOCK:
{stat_block_text}

EXTRACT AND OUTPUT ONLY THIS VALID, UNESCAPED JSON (absolutely no backslashes, no escape characters, no markdown):
{{
  "title": "creature name from stat block",
  "icon": "ONE EMOJI matching creature type - Minotaur->🐂, Dragon->🐉, Undead->💀, Elemental->⚡, etc. ABSOLUTELY NO SNAILS OR HORSES",
  "size": "Tiny|Small|Medium|Large|Huge|Gargantuan",
  "creature_type": "beast|humanoid|undead|fiend|celestial|dragon|elemental|construct|plant|aberration|monstrosity|ooze|giant",
  "hp": 76,
  "ac": 14,
  "explanation": "brief one sentence description",
  "stats": {{"str": 18, "dex": 11, "con": 16, "int": 6, "wis": 16, "cha": 9}},
  "attack_to_hit": [
    {{"name": "Greataxe", "roll": "1d20+6"}},
    {{"name": "Pseudopod", "roll": "1d20+3"}}
  ],
  "damage": [
    {{"name": "Greataxe", "roll": [{{"2d12+4": "slashing"}}]}},
    {{"name": "Pseudopod", "roll": [{{"1d6+1": "bludgeoning"}}, {{"2d6": "acid"}}], "Special": "nonmagical metal armor takes -1 AC penalty"}}
  ],
  "special": [
    {{"name": "Amorphous", "description": "The creature can move through narrow spaces"}},
    {{"name": "Corrode Metal", "description": "Any weapon that hits corrodes..."}}
  ]
}}

CRITICAL OUTPUT RULES:
1. NEVER use escape characters - output clean JSON with NO backslashes
2. Stats object MUST have lowercase keys: str, dex, con, int, wis, cha
3. TO-HIT BONUS RULE: Extract the bonus AS WRITTEN IN THE STAT BLOCK
   - If it says "+3 to hit" → use "roll": "1d20+3", DO NOT include numerics array
   - If it says "+6 to hit" → use "roll": "1d20+6", DO NOT include numerics array
   - The bonus in stat blocks is ALREADY CALCULATED; do not add stats modifiers again
   - Only use numerics array if the stat block explicitly references a stat (very rare), otherwise omit it
4. DAMAGE ROLL STRUCTURE: "roll": [{{"DICE_NOTATION": "damage_type"}}, {{"DICE_NOTATION": "damage_type"}}]
   - For SINGLE damage: [{{"1d6+1": "slashing"}}]
   - For MULTIPLE damages in ONE attack: [{{"1d6+1": "bludgeoning"}}, {{"2d6": "acid"}}]
   - DICE_NOTATION examples: "1d6", "2d8+4", "1d4+1", "2d6", etc (can include modifiers)
   - Always use array format, even for single damage type
5. DAMAGE TYPES MUST be lowercase: "slashing", "piercing", "fire", "cold", "necrotic", "poison", "acid", "thunder", "lightning", "force", "psychic", "radiant", "bludgeoning"
6. OPTIONAL "Special" field in damage object for special effects: "Special": "if wearing nonmagical armor, AC penalty -1"
7. special MUST be an array of objects with name and description: [{{"name": "Ability", "description": "what it does"}}]
8. Extract ALL special abilities from stat block (Amorphous, Corrode Metal, False Appearance, etc.)
9. Extract ALL actions and attacks with their damage descriptions
10. Output ONLY valid JSON, absolutely no markdown or extra text [/INST]"""
        
        logger.info("Sending stat block to model for parsing...")
        
        response = self.model(
            prompt,
            temperature=0.0,  # Lower temperature for more consistent, strict JSON output
            max_tokens=15000,
            top_p=0.9
        )
        
        response_text = response["choices"][0]["text"].strip()
        
        logger.info(f"Model response length: {len(response_text)} characters")
        logger.info(f"Full response:\n{response_text}")
        
        # Clean up escaped underscores that the model sometimes adds
        response_text = response_text.replace('\\"', '"').replace('\\_', '_')
        
        # Return the raw response for review
        return response_text
    
    def parse_and_format_for_db(self, stat_block_text: str) -> str:
        """
        Parse stat block and return raw response for review.
        
        Returns:
            Raw model response string
        """
        response_text = self.parse(stat_block_text)
        
        # Just return the raw response - client can parse it as needed
        return response_text


def get_parser(model_path: Optional[str] = None) -> StatBlockParser:
    """Singleton-ish getter for parser instance (creates new each time for simplicity)"""
    return StatBlockParser(model_path)


if __name__ == "__main__":
    # Test the parser with Gray Ooze - complex example with multiple damage types and special abilities
    test_statblock = """Gray Ooze
Medium ooze, Unaligned

Armor Class 8
Hit Points 22 (3d8+9)
Speed 10 ft., climb 10 ft.

STR 12 (+1)  DEX 6 (-2)  CON 16 (+3)  INT 1 (-5)  WIS 6 (-2)  CHA 2 (-4)

Skills Stealth +2
Damage Resistance Acid, Cold, Fire
Condition Immunities Blinded, Charmed, Deafened, Exhaustion, Frightened, Prone
Senses Blindsight 60 Ft. (Blind Beyond This Radius), passive Perception 8
Challenge 1/2 (100 XP)

Amorphous. The ooze can move through a space as narrow as 1 inch wide without squeezing.

Corrode Metal. Any nonmagical weapon made of metal that hits the ooze corrodes. After dealing damage, the weapon takes a permanent and cumulative -1 penalty to damage rolls. If its penalty drops to -5, the weapon is destroyed. Nonmagical ammunition made of metal that hits the ooze is destroyed after dealing damage. The ooze can eat through 2-inch-thick, nonmagical metal in 1 round.

False Appearance. While the ooze remains motionless, it is indistinguishable from an oily pool or wet rock.

ACTIONS

Pseudopod. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: (1d6 + 1) bludgeoning damage plus (2d6) acid damage. If the target is wearing nonmagical metal armor, its armor is partly corroded and takes a permanent and cumulative -1 penalty to the ac it offers. The armor is destroyed if the penalty reduces its AC to 10."""
    
    try:
        parser = get_parser()
        result = parser.parse_and_format_for_db(test_statblock)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
