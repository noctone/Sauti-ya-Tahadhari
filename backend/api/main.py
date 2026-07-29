"""
FastAPI layer wrapping the proven pipeline (Phases 1-3).

ENDPOINT DESIGN (post-audit):
- POST /pipeline/run   <- THE PRODUCT. Stateless demonstration of the core
                          value proposition: trigger in, validated AI output
                          out. This is the endpoint that should be shown
                          first during judging.
- POST /triggers       <- Same processing, but persisted + returns full
                          internal record (trigger, provenance, timestamps).
                          Supporting infrastructure for the officer dashboard
                          and audit trail UI (Phase 7/8), not the demo focus.
- GET  /triggers       <- List persisted records (dashboard listing).
- GET  /triggers/{id}  <- Fetch one persisted record (dashboard detail view).
- POST /triggers/load-samples <- Demo convenience: run all sample triggers at once.

Both /pipeline/run and /triggers call the same underlying _process_trigger()
function — no duplicated logic, just two different response shapes for two
different audiences (judges evaluating the core capability vs. a dashboard
needing full records).

In-memory storage only for now — Phase 5 (Supabase) replaces TRIGGER_STORE
with real persistence without changing any external endpoint contract.

Run:
    cd backend
    uvicorn api.main:app --reload --port 8000
Then visit http://localhost:8000/docs
"""
import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas.trigger import TriggerEvent
from ai.pipeline import run_pipeline, GenerationError
from ai.validator import validate_output

app = FastAPI(title="IGAD Early Warning Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Developer decision: tighten before any deployment beyond the hackathon
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: {trigger_id: full_record}
TRIGGER_STORE: dict = {}


def _process_trigger(trigger_data: dict) -> dict:
    """
    The single core operation of the entire product: trigger -> AI
    generation -> validation. Everything else in this file is a different
    view onto this one function's result.
    Raises HTTPException on any failure so both callers get consistent errors.
    """
    try:
        trigger = TriggerEvent(**trigger_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid trigger event: {e}")

    try:
        output = run_pipeline(trigger)
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=f"Server misconfiguration: {e}")

    validation = validate_output(trigger, output)

    full_record = {
        "trigger": trigger.model_dump(mode="json"),
        "output": output,
        "validation": {"passed": validation.passed, "mismatches": validation.mismatches},
        "processed_at": datetime.utcnow().isoformat(),
    }
    TRIGGER_STORE[trigger.id] = full_record
    return full_record


@app.get("/")
def root():
    """Quick landing so judges hitting the bare URL don't just see a 404."""
    return {
        "product": "IGAD Early Warning Pipeline",
        "core_endpoint": "POST /pipeline/run",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "llm_provider": os.environ.get("LLM_PROVIDER", "anthropic")}


@app.post("/pipeline/run")
def run_pipeline_endpoint(trigger_data: dict):
    """
    THE CORE PRODUCT ENDPOINT.
    Input: a raw trigger event JSON body.
    Output: exactly the product's value proposition — the safety-locked
    facts, the AI-generated public message, the officer checklist, and
    whether the fact-locking guarantee held.
    """
    full_record = _process_trigger(trigger_data)
    return {
        "locked_facts": full_record["output"]["locked_facts"],
        "public_message": full_record["output"]["public_message"],
        "officer_checklist": full_record["output"]["officer_checklist"],
        "validation": full_record["validation"],
    }


@app.post("/triggers")
def ingest_trigger(trigger_data: dict):
    """Same processing as /pipeline/run, but returns the full persisted record (for the dashboard)."""
    return _process_trigger(trigger_data)


@app.get("/triggers")
def list_triggers():
    records = list(TRIGGER_STORE.values())
    records.sort(key=lambda r: r["processed_at"], reverse=True)
    return records


@app.get("/triggers/{trigger_id}")
def get_trigger_output(trigger_id: str):
    record = TRIGGER_STORE.get(trigger_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No processed trigger with id '{trigger_id}'")
    return record


@app.get("/samples")
def list_sample_triggers():
    """Additive, read-only: exposes data/sample_triggers.json for the frontend to populate a picker."""
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_triggers.json")
    with open(data_path) as f:
        return json.load(f)


@app.post("/triggers/load-samples")
def load_sample_triggers():
    """Demo convenience: runs every sample trigger through /pipeline/run in one call."""
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_triggers.json")
    with open(data_path) as f:
        raw_triggers = json.load(f)

    results = []
    for raw in raw_triggers:
        try:
            result = run_pipeline_endpoint(raw)
            results.append({"id": raw["id"], "status": "ok", "validation": result["validation"]})
        except HTTPException as e:
            results.append({"id": raw["id"], "status": "error", "detail": e.detail})

    return {"processed": results}
