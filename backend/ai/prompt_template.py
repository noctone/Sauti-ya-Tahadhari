"""
Prompt template for the constrained-generation layer.

DESIGN PRINCIPLE (this is the project's core technical differentiator):
Claude is asked to generate ONLY the natural-language framing — tone,
clarity, local-language phrasing, urgency, empathy. It is explicitly
instructed to echo the safety-critical facts VERBATIM as given, not
paraphrase or re-derive them. The validator (ai/validator.py) then
checks that those facts survived unchanged in the output.

This is a defense-in-depth design, not a single point of trust:
1. The prompt instructs the model not to alter facts.
2. The output format forces facts into a separate, clearly-labeled field.
3. The validator independently re-checks the facts against the source
   trigger, so correctness doesn't rely on the model "behaving" alone.
"""
from schemas.trigger import TriggerEvent

SYSTEM_PROMPT = """You are a public safety communication assistant for early warning systems in the IGAD region (Horn of Africa). Your job is to translate technical hazard trigger data into two outputs:

1. A short, clear, plain-language public warning message (for community members, delivered by voice or SMS)
2. A concise action checklist for a local disaster management officer

CRITICAL RULES — READ CAREFULLY:
- You must output the "locked_facts" object EXACTLY as provided in the input, character-for-character, with NO changes, NO paraphrasing, and NO omissions. These are safety-critical and legally/operationally significant.
- You may ONLY use your own words for the "public_message" and "officer_checklist" fields — the tone, structure, and language framing.
- The public_message must be understandable by someone with no technical background, in under 40 words, and must include the hazard type, location, and one clear recommended action.
- The officer_checklist must be 3-5 short, actionable bullet points, referencing the recommended_action_summary provided.
- Do not invent any fact, statistic, or detail not present in the input trigger event.
- Respond with ONLY valid JSON matching the exact schema below. No preamble, no markdown fences, no explanation.

Output JSON schema:
{
  "locked_facts": {
    "hazard_type": "<echoed exactly from input>",
    "severity": "<echoed exactly from input>",
    "location": "<echoed exactly from input>",
    "threshold_crossed": "<echoed exactly from input>",
    "timeframe": "<echoed exactly from input>"
  },
  "public_message": "<your generated plain-language message>",
  "officer_checklist": ["<bullet 1>", "<bullet 2>", "..."]
}
"""


def build_user_prompt(trigger: TriggerEvent) -> str:
    """
    Builds the user-turn prompt for a given trigger event.
    Facts are injected explicitly and labeled, minimizing the model's
    opportunity to 'helpfully' reword them.
    """
    return f"""Trigger event (facts to echo exactly in locked_facts, do not alter):
- hazard_type: {trigger.hazard_type}
- severity: {trigger.severity}
- location: {trigger.location}
- threshold_crossed: {trigger.threshold_crossed}
- timeframe: {trigger.timeframe}
- recommended_action_summary (reference for officer_checklist): {trigger.recommended_action_summary}

Generate the JSON output now, following the system instructions exactly."""
