from dataclasses import dataclass, asdict, field
from typing import Optional
from datetime import datetime, timezone
import uuid


PROBLEM_TYPES = [
    "Borehole is Dry",
    "Pipe Broken or Blocked",
    "Unsafe Route",
    "Water Stolen or Diverted",
    "Pump Not Working",
    "Water is Contaminated",
    "Other",
]

SEVERITY_MAP = {
    "Borehole is Dry":          "high",
    "Pipe Broken or Blocked":   "medium",
    "Unsafe Route":             "high",
    "Water Stolen or Diverted": "high",
    "Pump Not Working":         "medium",
    "Water is Contaminated":    "high",
    "Other":                    "low",
}


@dataclass
class Report:
    """
    A community-submitted report about a water point.
    Anonymous by design — no user identity is stored.
    """
    water_point_id:   str
    water_point_name: str
    problem_type:     str

    # Auto-generated
    id:               str   = field(default_factory=lambda: f"WP-{uuid.uuid4().hex[:8].upper()}")
    severity:         str   = "medium"
    status:           str   = "open"       # open | in_progress | resolved
    submitted_at:     str   = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at:      Optional[str] = None

    # Optional details from submitter
    notes:            str   = ""
    urgency:          str   = "normal"     # normal | urgent | emergency

    # NGO internal fields — not visible to community
    assigned_to:      str   = ""
    internal_notes:   str   = ""
    resolved_by:      str   = ""

    # Submission channel
    channel:          str   = "web"        # web | ussd | sms

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(data: dict) -> "Report":
        return Report(**{k: v for k, v in data.items() if k in Report.__dataclass_fields__})

    def resolve(self, resolved_by: str = "", notes: str = "") -> None:
        self.status      = "resolved"
        self.resolved_at = datetime.now(timezone.utc).isoformat()
        self.resolved_by = resolved_by
        if notes:
            self.internal_notes = notes
