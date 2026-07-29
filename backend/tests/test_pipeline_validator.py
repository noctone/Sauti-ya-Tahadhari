"""
End-to-end proof: real trigger -> real provider call -> validator check.
This is the single test that matters most for the demo's credibility claim.

Run:
    cd backend
    $env:LLM_PROVIDER = "gemini"          # or whichever provider you've set up
    $env:GEMINI_API_KEY = "..."
    python tests/test_pipeline_validator.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.trigger import TriggerEvent
from ai.pipeline import run_pipeline
from ai.validator import validate_output


def run_all_sample_triggers():
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_triggers.json")
    with open(data_path) as f:
        raw_triggers = json.load(f)

    results = []
    for raw in raw_triggers:
        trigger = TriggerEvent(**raw)
        print(f"\n{'='*60}\nTrigger: {trigger.id} ({trigger.hazard_type} / {trigger.severity})\n{'='*60}")
        try:
            output = run_pipeline(trigger)
            result = validate_output(trigger, output)
            print(result.summary())
            if result.passed:
                print(f"\npublic_message: {output['public_message']}")
            results.append((trigger.id, result.passed))
        except Exception as e:
            print(f"ERROR on {trigger.id}: {e}")
            results.append((trigger.id, False))

    print(f"\n{'='*60}\nSUMMARY: {sum(1 for _, ok in results if ok)}/{len(results)} triggers passed end-to-end\n{'='*60}")
    for tid, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'} — {tid}")

    return results


if __name__ == "__main__":
    run_all_sample_triggers()
