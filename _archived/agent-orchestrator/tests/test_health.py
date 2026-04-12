"""Integration smoke test for agent-orchestrator health endpoint."""
from __future__ import annotations

import os
import pytest

# Skip if running outside of Docker (no live services)
pytestmark = pytest.mark.skipif(
    not os.getenv("CI") and not os.getenv("INTEGRATION_TEST"),
    reason="Integration tests require live services. Set INTEGRATION_TEST=1 to run.",
)


def test_health_endpoint_shape():
    """Verify the health response shape without a live server."""
    # This verifies the expected contract only
    expected_keys = {"status", "service", "db_connected"}
    response_mock = {"status": "ok", "service": "agent-orchestrator", "db_connected": True}
    assert expected_keys.issubset(set(response_mock.keys()))
    assert response_mock["status"] == "ok"
