# Models Directory

This directory holds GGUF quantized language models for local LLM inference.

## Setting Up Mistral 7B for Stat Block Parsing

The system uses **Mistral 7B Instruct** to parse D&D 5e stat blocks locally. It's much better than TinyLlama for structured JSON extraction.

**Why Mistral over TinyLlama?**
- TinyLlama (1.1B) struggles with JSON format compliance
- Mistral 7B is explicitly trained for instruction-following and structured outputs
- ~4.5 GB (Q4 quantization)
- Same zero-background-service design

### Prerequisites: Windows Build Tools

`llama-cpp-python` requires a C++ compiler. Install one of these:

**Option A: Visual Studio Build Tools** (Recommended, ~5 GB)
1. Download: https://visualstudio.microsoft.com/downloads/
2. Select "Desktop development with C++"
3. Install (~30 min)

**Option B: MinGW** (Lightweight, ~500 MB)
1. Download: https://www.mingw-w64.org/
2. Install to `C:\mingw64`
3. Add to PATH: `C:\mingw64\bin`

### Quick Start

1. **Download Mistral 7B GGUF** (~4.5 GB):
   ```bash
   cd models
   
   # Download the Q4_K_M quantized version (recommended)
   Invoke-WebRequest -Uri "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/Mistral-7B-Instruct-v0.1.Q4_K_M.gguf" -OutFile "mistral.gguf"
   ```

   **Alternative: Direct download**
   - Visit: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF
   - Download `Mistral-7B-Instruct-v0.1.Q4_K_M.gguf`
   - Place in `models/` folder
   - Rename to `mistral.gguf`

2. **Update the parser to use Mistral**:
   - Edit `lib/parse_statblock.py` (optional - will auto-detect `mistral.gguf`)
   - Or just place the file in `models/mistral.gguf`

3. **Test the parser**:
   ```bash
   python lib/parse_statblock.py
   ```

### Usage

**Via Flask API** (after starting server with `python server_flask.py`):

```bash
# POST a stat block for parsing
$statblock = @"
Goblin
Small Humanoid (Goblinoid), Neutral Evil
Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.
STR 8 (-1)  DEX 14 (+2)  CON 10 (+0)  INT 10 (+0)  WIS 8 (-1)  CHA 8 (-1)
Skills Stealth +6
Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1/4 (50 XP)

... traits and actions ...
"@

$body = @{
    statblock = $statblock
    insert = $true  # Optional: insert directly to DB
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/parse-statblock" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Via Python**:

```python
from lib.parse_statblock import StatBlockParser

parser = StatBlockParser("models/tinyllama.gguf")
parsed = parser.parse_and_format_for_db(stat_block_text)
print(parsed)
```

### Model Details

| Property | Value |
|----------|-------|
| Model | TinyLlama 1.1B Chat |
| Quantization | Q4_K_M (4-bit) |
| Size | ~600 MB |
| Memory | ~3-4 GB RAM (first load) |
| Speed | ~5-10s first parse, ~2-3s subsequent |
| Context | 2048 tokens |
| Precision | Good for structured extraction tasks |

### Troubleshooting

**Error: "No model found in models/ directory"**
- Download Mistral 7B (recommended) or TinyLlama
- Place file in `models/` folder
- Rename to `mistral.gguf` or `tinyllama.gguf`

**Error: "CMAKE_C_COMPILER not set" or "nmake not found"**
- You need C++ build tools installed
- Install Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
- Select "Desktop development with C++"
- Reinstall llama-cpp-python after installation

**Model loads very slowly on first parse**
- First load takes ~10-30s depending on model size
- Subsequent parses within same session are faster (~2-5s)
- This is normal and expected

**Out of Memory errors**
- Reduce `n_threads` in `lib/parse_statblock.py` 
- Or switch to TinyLlama instead of Mistral (smaller model)

**Bad JSON output / Model seems confused**
- Mistral 7B works much better than TinyLlama for this task
- If using TinyLlama, upgrade to Mistral 7B
- Try re-running if output is inconsistent

### Advanced: Using Different Models

The parser auto-detects models in `models/` folder:

| Model | Size | Performance | JSON Quality | File |
|-------|------|-------------|--------------|------|
| **Mistral 7B** | 4.5 GB | 2-5s per parse | Excellent | `mistral.gguf` |
| TinyLlama 1.1B | 600 MB | 5-10s per parse | Poor | `tinyllama.gguf` |
| Llama 2 7B | 4 GB | 2-4s per parse | Very Good | `llama2.gguf` |
| Phi 2 2.7B | 1.5 GB | 3-8s per parse | Good | `phi.gguf` |

**Recommended: Use Mistral 7B for best results**

To use a specific model:
```python
parser = StatBlockParser("path/to/your/model.gguf")
```

Or just place the model file in `models/` with name `mistral.gguf`, `tinyllama.gguf`, etc.

## Notes

- Models are **not** version controlled (`.gitignore` excludes `*.gguf`)
- Each developer needs to download the model locally
- Model files persist between server restarts (only loaded on first parse request)
- No background Ollama service needed - completely self-contained
