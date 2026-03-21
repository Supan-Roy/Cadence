from rest_framework.throttling import UserRateThrottle


class StreamThrottle(UserRateThrottle):
    scope = "stream"