"""
AI pipeline: TriggerEvent -> LLMProvider -> structured dual output.

Provider-agnostic by design: this file has NO import of anthropic,
google.generativeai, or openai directly. It only knows about the
LLMProvider interface (ai/providers/base.py). Which concrete provider
gets used is decided entirely by ai/providers/factory.py, driven by
the LLM_PROVIDER env var.

Requires: `pip install -r requirements.txt` (installs whichever
provider SDK you intend to use), and the API key for that provider set.

Run standalone for testing:
    export LLM_PROVIDER=anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
    python ai/pipeline.py --trigger-id trg_0001
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.trigger import TriggerEvent
from ai.prompt_template import SYSTEM_PROMPT, build_user_prompt
from ai.providers.base import LLMProvider
from ai.providers.factory import get_provider


class GenerationError(Exception):
    """Raised when the model output can't be parsed as valid JSON matching our schema."""
    pass


def run_pipeline(trigger: TriggerEvent, provider: LLMProvider = None) -> dict:
    """
    Sends a trigger event to whichever LLMProvider is configured (or
    passed in explicitly, e.g. for testing with a fake provider) and
    returns the parsed structured output. Does NOT validate fact-locking
    — that's ai/validator.py's job. This function's only responsibility
    is: call the provider, parse the JSON, fail loudly if malformed.
    """
    provider = provider or get_provider()

    raw_text = provider.generate(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=build_user_prompt(trigger),
        max_tokens=1000,
    ).strip()

    # Defensive: strip markdown fences if a model adds them despite instructions
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:].strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise GenerationError(f"Model did not return valid JSON. Raw output: {raw_text[:500]}") from e

    required_keys = {"locked_facts", "public_message", "officer_checklist"}
    missing = required_keys - parsed.keys()
    if missing:
        raise GenerationError(f"Model output missing required keys: {missing}")

    return parsed


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--trigger-id", default="trg_0001", help="ID from data/sample_triggers.json")
    args = parser.parse_args()

    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_triggers.json")
    with open(data_path) as f:
        triggers_raw = json.load(f)

    match = next((t for t in triggers_raw if t["id"] == args.trigger_id), None)
    if not match:
        print(f"No trigger with id {args.trigger_id} found.")
        sys.exit(1)

    trigger = TriggerEvent(**match)
    active_provider = os.environ.get("LLM_PROVIDER", "anthropic")
    print(f"Running pipeline for trigger: {trigger.id} ({trigger.hazard_type} / {trigger.severity}) via provider='{active_provider}'\n")

    result = run_pipeline(trigger)
    print(json.dumps(result, indent=2))
