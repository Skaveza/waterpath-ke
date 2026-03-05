import africastalking
from config import Config


def _get_sms_service():
    africastalking.initialize(
        username=Config.AFRICASTALKING_USERNAME,
        api_key=Config.AFRICASTALKING_API_KEY,
    )
    return africastalking.SMS


def send_dispatch_sms(phone: str, message: str) -> dict:
    """
    Send an SMS to a repair technician via Africa's Talking.
    Phone number must include country code e.g. +254712345678
    """
    try:
        sms      = _get_sms_service()
        response = sms.send(message, [phone])
        recipients = response.get("SMSMessageData", {}).get("Recipients", [])

        if recipients and recipients[0].get("status") == "Success":
            return {"success": True, "message_id": recipients[0].get("messageId")}
        else:
            return {"success": False, "error": str(response)}

    except Exception as e:
        # Log but don't crash — SMS failure shouldn't break dispatch
        print(f"[SMS ERROR] {e}")
        return {"success": False, "error": str(e)}


def send_resolution_sms(phone: str, report_id: str, point_name: str) -> dict:
    """Notify a reporter (if phone provided) that their report was resolved."""
    message = (
        f"WaterPath Update\n"
        f"Report {report_id} resolved.\n"
        f"{point_name} has been attended to.\n"
        f"Thank you for reporting."
    )
    return send_dispatch_sms(phone, message)
