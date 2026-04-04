import re


def _detect_platform(user_agent: str) -> str:
    ua = user_agent or ""

    android = re.search(r"Android\s+([\d.]+)", ua, re.IGNORECASE)
    if android:
        return f"Android {android.group(1)}"

    iphone = re.search(r"iPhone\s+OS\s+([\d_]+)", ua, re.IGNORECASE)
    if iphone:
        return f"iPhone iOS {iphone.group(1).replace('_', '.')}"

    ipad = re.search(r"iPad;\s*CPU\s*OS\s*([\d_]+)", ua, re.IGNORECASE)
    if ipad:
        return f"iPad iPadOS {ipad.group(1).replace('_', '.')}"

    windows = re.search(r"Windows NT\s+([\d.]+)", ua, re.IGNORECASE)
    if windows:
        mapping = {
            "10.0": "10/11",
            "6.3": "8.1",
            "6.2": "8",
            "6.1": "7",
        }
        version = mapping.get(windows.group(1), windows.group(1))
        return f"Windows {version}"

    mac = re.search(r"Mac OS X\s+([\d_]+)", ua, re.IGNORECASE)
    if mac:
        return f"macOS {mac.group(1).replace('_', '.')}"

    if re.search(r"Linux", ua, re.IGNORECASE):
        return "Linux"

    return "Unknown OS"


def _detect_browser(user_agent: str) -> str:
    ua = user_agent or ""

    if re.search(r"Edg/", ua):
        return "Edge"
    if re.search(r"OPR/|Opera", ua):
        return "Opera"
    if re.search(r"SamsungBrowser/", ua):
        return "Samsung Internet"
    if re.search(r"CriOS/", ua):
        return "Chrome"
    if re.search(r"FxiOS/", ua):
        return "Firefox"
    if re.search(r"Chrome/", ua) and not re.search(r"Chromium|Edg/|OPR/", ua):
        return "Chrome"
    if re.search(r"Firefox/", ua):
        return "Firefox"
    if re.search(r"Safari/", ua) and not re.search(r"Chrome/|CriOS/|Chromium|Edg/|OPR/", ua):
        return "Safari"

    return "Browser"


def is_probably_raw_user_agent(value: str) -> bool:
    if not value:
        return False
    return "mozilla/" in value.lower()


def get_friendly_device_name(user_agent: str) -> str:
    if not user_agent:
        return "Unknown device"
    platform = _detect_platform(user_agent)
    browser = _detect_browser(user_agent)
    return f"{platform} - {browser}"
