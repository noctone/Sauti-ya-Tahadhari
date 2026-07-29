"""
Trigger event schema — the single source of truth for hazard events flowing
through the pipeline. Every other component (prompt template, validator,
API, frontend) is built against this shape.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class HazardType(str, Enum):
    DROUGHT = "drought"
    FLOOD = "flood"
    FOOD_INSECURITY = "food_insecurity"
    HEALTH_EMERGENCY = "health_emergency"
    LOCUST = "locust"


class Severity(str, Enum):
    WATCH = "watch"          # earliest signal
    WARNING = "warning"      # threshold crossed
    EMERGENCY = "emergency"  # highest severity


class DataSource(str, Enum):
    ICPAC_LIVE = "icpac_live"          # confirmed live ICPAC data
    ICPAC_DOCUMENTED_SAMPLE = "icpac_documented_sample"  # built to match ICPAC's known schema, not live-pulled
    MANUAL_TEST = "manual_test"        # hackathon test fixture


class TriggerEvent(BaseModel):
    """
    A single hazard trigger event. All fields here are treated as
    SAFETY-CRITICAL FACTS in the AI pipeline: the generation layer is
    never allowed to alter these values, only to explain them in
    plain language. See ai/prompt_template.py and ai/validator.py.
    """
    id: str = Field(..., description="Unique trigger ID, e.g. 'trg_0001'")
    hazard_type: HazardType
    severity: Severity
    location: str = Field(..., description="Human-readable location, e.g. 'Marsabit County, Kenya'")
    threshold_crossed: str = Field(..., description="The specific threshold/indicator that fired, e.g. '3-month SPI below -1.5'")
    timeframe: str = Field(..., description="When the hazard is expected/active, e.g. 'next 5-7 days'")
    recommended_action_summary: str = Field(..., description="Short official action reference this event maps to, e.g. 'Activate livestock destocking protocol'")
    source: DataSource
    issued_at: datetime

    class Config:
        use_enum_values = True


if __name__ == "__main__":
    # Quick self-check — run with: python schemas/trigger.py
    sample = TriggerEvent(
        id="trg_0001",
        hazard_type=HazardType.DROUGHT,
        severity=Severity.WARNING,
        location="Marsabit County, Kenya",
        threshold_crossed="3-month SPI below -1.5",
        timeframe="next 5-7 days",
        recommended_action_summary="Activate livestock destocking protocol",
        source=DataSource.ICPAC_DOCUMENTED_SAMPLE,
        issued_at=datetime.utcnow(),
    )
    print(sample.model_dump_json(indent=2))
