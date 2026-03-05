from dataclasses import dataclass, asdict, field
from typing import Optional


@dataclass
class WaterPoint:
    """
    Represents a single borehole or water point in Turkana County.
    Source: Rural Focus Ltd / Water Resources Authority Kenya.
    """
    id:               str
    name:             str
    locality:         str
    latitude:         float
    longitude:        float

    # Water quality — from lab measurements
    water_quality:    str            # excellent | drinkable | brackish | saline | unknown
    ec:               Optional[float] = None   # Electrical conductivity (µS/cm) — salinity proxy
    ph:               Optional[float] = None
    well_depth:       Optional[float] = None   # metres
    yield_ls:         Optional[float] = None   # litres per second

    # Operational status — updated by community reports
    # unknown = no reports yet | functional | issues | non_functional
    operation_status: str            = "unknown"

    # ML-predicted quality for boreholes with no EC measurement
    predicted_quality:       Optional[str]   = None
    prediction_confidence:   Optional[float] = None  # 0.0 – 1.0

    # Metadata
    source:           str  = "Rural Focus Ltd / WRA Kenya"
    drilling_date:    str  = ""
    last_report_at:   str  = ""
    report_count:     int  = 0

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(data: dict) -> "WaterPoint":
        return WaterPoint(**{k: v for k, v in data.items() if k in WaterPoint.__dataclass_fields__})

    def display_status(self) -> str:
        """Human-readable status combining operation_status and water_quality."""
        if self.operation_status == "non_functional":
            return "Non-functional"
        if self.water_quality == "saline":
            return "Saline — Desalination Required"
        if self.water_quality == "brackish":
            return "Brackish — Treatment Advised"
        if self.operation_status == "functional":
            return "Functional"
        return "Status Unknown"
