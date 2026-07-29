# Backend Quickstart — Phase 0-3 (Provider-Agnostic)

## Architecture
The pipeline depends only on the `LLMProvider` interface (`ai/providers/base.py`).
Three implementations exist: Anthropic, Gemini, OpenAI. Which one runs is decided
by **one config value** — the `LLM_PROVIDER` environment variable — nothing else
in the codebase changes.

```
ai/pipeline.py           <- depends only on the interface below
ai/providers/base.py     <- LLMProvider abstract interface
ai/providers/factory.py  <- reads LLM_PROVIDER, returns the right implementation
ai/providers/anthropic_provider.py
ai/providers/gemini_provider.py
ai/providers/openai_provider.py
```

## Setup

You only need to install the SDK for the ONE provider you're using, plus the core deps.

### macOS / Linux (bash/zsh)
```bash
cd backend
pip install -r requirements.txt   # installs core + all 3 provider SDKs; trim requirements.txt if you only want one

# Pick ONE provider and set its key:
export LLM_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your_key_here

# OR
export LLM_PROVIDER=gemini
export GEMINI_API_KEY=your_key_here

# OR
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your_key_here

# Optional: override the default model for whichever provider is active
export LLM_MODEL=your_preferred_model_name
```

### Windows (PowerShell)
```powershell
cd backend
pip install -r requirements.txt

# Pick ONE provider and set its key (PowerShell session-only — see note below):
$env:LLM_PROVIDER = "anthropic"
$env:ANTHROPIC_API_KEY = "your_key_here"

# OR
$env:LLM_PROVIDER = "gemini"
$env:GEMINI_API_KEY = "your_key_here"

# OR
$env:LLM_PROVIDER = "openai"
$env:OPENAI_API_KEY = "your_key_here"

# Optional: override the default model
$env:LLM_MODEL = "your_preferred_model_name"
```
**Note:** `$env:VAR = "value"` only persists for the current PowerShell session/window.
To make it persistent across sessions, use:
```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your_key_here", "User")
```
then close and reopen PowerShell for it to take effect.

## Run order (proves the critical path end to end)

1. **Schema self-check**:
```
python schemas/trigger.py
```
(identical command on PowerShell — `python` works the same there)

2. **Validator self-test** — no API call, no provider needed:
```
python ai/validator.py
```

3. **Full pipeline** (requires your chosen provider's API key + network):
```
python ai/pipeline.py --trigger-id trg_0001
```
Expect: JSON with `locked_facts`, `public_message`, `officer_checklist`.
The printed line `via provider='...'` confirms which provider actually ran —
use this to verify you're testing the one you think you are.

4. **Switching providers** — change one line, nothing else:
```bash
# bash
export LLM_PROVIDER=gemini && export GEMINI_API_KEY=your_key
python ai/pipeline.py --trigger-id trg_0001
```
```powershell
# PowerShell
$env:LLM_PROVIDER = "gemini"; $env:GEMINI_API_KEY = "your_key"
python ai/pipeline.py --trigger-id trg_0001
```

## If something breaks
Report back to me with:
- The exact command you ran (bash or PowerShell — tell me which)
- Which `LLM_PROVIDER` was active
- The full error/traceback
- Which step (1-4) it happened on
