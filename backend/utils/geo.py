import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance in km between two GPS coordinates
    using the Haversine formula.
    """
    R = 6371.0  # Earth radius in km

    phi1    = math.radians(lat1)
    phi2    = math.radians(lat2)
    d_phi   = math.radians(lat2 - lat1)
    d_lam   = math.radians(lon2 - lon1)

    a = (math.sin(d_phi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2)

    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def walk_time_minutes(distance_km: float, speed_kmh: float = 5.0) -> int:
    """Estimate walk time in minutes given distance and average walking speed."""
    return int((distance_km / speed_kmh) * 60)


def nearest_points(lat: float, lon: float, points: list, limit: int = 10) -> list:
    """
    Sort a list of water point dicts by distance from (lat, lon).
    Attaches distance_km and walk_minutes to each point.
    """
    for p in points:
        dist = haversine_km(lat, lon, p["latitude"], p["longitude"])
        p["distance_km"]   = round(dist, 2)
        p["walk_minutes"]  = walk_time_minutes(dist)
    return sorted(points, key=lambda x: x["distance_km"])[:limit]
