"""
Output validator — the engineered safety guarantee, independent of
whether the model 'behaved' in the prompt layer.

This is deliberately simple: strict equality between what the model
echoed back as locked_facts and the original trigger event's fields.
No LLM judgment involved here on purpose — a safety check that itself
relies on an LLM to grade correctness is circular and untrustworthy.
"""
from dataclasses import dataclass, field
from schemas.trigger import TriggerEvent


@dataclass
class ValidationResult:
    passed: bool
    mismatches: list[str] = field(default_factory=list)

    def summary(self) -> str:
        if self.passed:
            return "PASS — all locked facts match source trigger exactly."
        lines = ["FAIL — the following fields were altered or missing:"]
        lines.extend(f"  - {m}" for m in self.mismatches)
        return "\n".join(lines)


FACT_FIELDS = ["hazard_type", "severity", "location", "threshold_crossed", "timeframe"]


def validate_output(trigger: TriggerEvent, model_output: dict) -> ValidationResult:
    """
    Compares model_output['locked_facts'] against the source trigger,
    field by field, with exact string matching (case-insensitive,
    whitespace-normalized — real-world models may vary casing/spacing
    even when not changing meaning, and we don't want false failures
    on that alone, only on actual content drift).
    """
    locked = model_output.get("locked_facts", {})
    mismatches = []

    for fld in FACT_FIELDS:
        source_value = str(getattr(trigger, fld)).strip().lower()
        model_value = str(locked.get(fld, "")).strip().lower()
        if fld not in locked:
            mismatches.append(f"{fld}: MISSING from model output")
        elif source_value != model_value:
            mismatches.append(
                f"{fld}: source='{getattr(trigger, fld)}' vs model='{locked.get(fld)}'"
            )

    # Structural checks beyond fact-locking
    public_message = model_output.get("public_message", "")
    if not public_message or len(public_message.split()) > 60:
        mismatches.append(
            f"public_message: missing or too long ({len(public_message.split())} words, expected <=60 with buffer over the 40-word target)"
        )

    checklist = model_output.get("officer_checklist", [])
    if not isinstance(checklist, list) or not (2 <= len(checklist) <= 6):
        mismatches.append(f"officer_checklist: expected 2-6 items, got {checklist!r}")

    return ValidationResult(passed=(len(mismatches) == 0), mismatches=mismatches)


if __name__ == "__main__":
    # Self-test using two cases: a CORRECT output and a DELIBERATELY CORRUPTED one.
    # This is exactly the on-screen demo proof described in the strategy doc.
    import json
    from datetime import datetime

    trigger = TriggerEvent(
        id="trg_0001",
        hazard_type="drought",
        severity="warning",
        location="Marsabit County, Kenya",
        threshold_crossed="3-month SPI below -1.5",
        timeframe="next 5-7 days",
        recommended_action_summary="Activate livestock destocking protocol",
        source="icpac_documented_sample",
        issued_at=datetime.utcnow(),
    )

    correct_output = {
        "locked_facts": {
            "hazard_type": "drought",
            "severity": "warning",
            "location": "Marsabit County, Kenya",
            "threshold_crossed": "3-month SPI below -1.5",
            "timeframe": "next 5-7 days",
        },
        "public_message": "Drought warning for Marsabit County: dry conditions expected over the next 5-7 days. Consider moving livestock to grazing reserves now.",
        "officer_checklist": [
            "Activate livestock destocking protocol",
            "Notify community leaders in affected wards",
            "Coordinate with county drought management office",
        ],
    }

    corrupted_output = {
        "locked_facts": {
            "hazard_type": "drought",
            "severity": "SEVERE",  # tampered — model invented a severity not in the schema/source
            "location": "Marsabit County, Kenya",
            "threshold_crossed": "3-month SPI below -1.5",
            "timeframe": "next week",  # tampered — vague paraphrase instead of exact source value
        },
        "public_message": "Drought warning for Marsabit.",
        "officer_checklist": ["Do something"],
    }

    print("=== Test 1: Correct output ===")
    result = validate_output(trigger, correct_output)
    print(result.summary())

    print("\n=== Test 2: Corrupted output (should FAIL) ===")
    result = validate_output(trigger, corrupted_output)
    print(result.summary())
