"""
Tests for domain models
"""
import pytest
from pydantic import ValidationError
from app.domain.models import ClipRequest, JobState, ClipResult, JobStatus


class TestClipRequest:
    """Test ClipRequest validation"""

    def test_valid_clip_request(self):
        """Should accept valid clip request"""
        req = ClipRequest(
            source="https://example.com/video.mp4",
            start_sec=10.5,
            duration_sec=30.0,
            out_ext="mp4",
        )
        assert req.source == "https://example.com/video.mp4"
        assert req.start_sec == 10.5
        assert req.duration_sec == 30.0
        assert req.out_ext == "mp4"

    def test_default_output_extension(self):
        """Should default to mp4 if out_ext not provided"""
        req = ClipRequest(
            source="https://example.com/video.mp4", start_sec=0, duration_sec=10
        )
        assert req.out_ext == "mp4"

    def test_negative_start_rejected(self):
        """Should reject negative start time"""
        with pytest.raises(ValidationError):
            ClipRequest(
                source="https://example.com/video.mp4",
                start_sec=-5,
                duration_sec=10,
            )

    def test_zero_duration_rejected(self):
        """Should reject zero duration"""
        with pytest.raises(ValidationError):
            ClipRequest(
                source="https://example.com/video.mp4", start_sec=0, duration_sec=0
            )

    def test_negative_duration_rejected(self):
        """Should reject negative duration"""
        with pytest.raises(ValidationError):
            ClipRequest(
                source="https://example.com/video.mp4", start_sec=0, duration_sec=-10
            )

    def test_duration_exceeds_limit(self):
        """Should reject duration > 3600 seconds (1 hour)"""
        with pytest.raises(ValidationError):
            ClipRequest(
                source="https://example.com/video.mp4",
                start_sec=0,
                duration_sec=3601,
            )

    def test_invalid_extension_rejected(self):
        """Should reject invalid output extension"""
        with pytest.raises(ValidationError):
            ClipRequest(
                source="https://example.com/video.mp4",
                start_sec=0,
                duration_sec=10,
                out_ext="avi",  # Not in allowed list
            )

    def test_valid_extensions(self):
        """Should accept all valid extensions"""
        valid_exts = ["mp4", "mov", "webm", "mkv"]
        for ext in valid_exts:
            req = ClipRequest(
                source="https://example.com/video.mp4",
                start_sec=0,
                duration_sec=10,
                out_ext=ext,
            )
            assert req.out_ext == ext

    def test_optional_name_field(self):
        """Should handle optional name field"""
        req1 = ClipRequest(
            source="https://example.com/video.mp4", start_sec=0, duration_sec=10
        )
        assert req1.name is None

        req2 = ClipRequest(
            source="https://example.com/video.mp4",
            start_sec=0,
            duration_sec=10,
            name="my-clip",
        )
        assert req2.name == "my-clip"


class TestJobState:
    """Test JobState enum"""

    def test_job_states_exist(self):
        """Should have all expected job states"""
        assert JobState.queued == "queued"
        assert JobState.started == "started"
        assert JobState.finished == "finished"
        assert JobState.failed == "failed"
        assert JobState.deferred == "deferred"
        assert JobState.canceled == "canceled"
        assert JobState.unknown == "unknown"

    def test_job_state_values(self):
        """Should have correct string values"""
        states = [state.value for state in JobState]
        expected = ["queued", "started", "finished", "failed", "deferred", "canceled", "unknown"]
        assert set(states) == set(expected)


class TestClipResult:
    """Test ClipResult model"""

    def test_valid_clip_result(self):
        """Should accept valid clip result"""
        result = ClipResult(
            job_id="job_123",
            url="https://storage.example.com/clips/abc123.mp4",
            size_bytes=1024000,
            filename="clip.mp4",
        )
        assert result.job_id == "job_123"
        assert result.size_bytes == 1024000
        assert result.filename == "clip.mp4"

    def test_clip_result_with_local_url(self):
        """Should accept local file path as URL"""
        result = ClipResult(
            job_id="job_123",
            url="/data/clips/abc123.mp4",
            size_bytes=1024000,
            filename="clip.mp4",
        )
        assert result.url == "/data/clips/abc123.mp4"


class TestJobStatus:
    """Test JobStatus model"""

    def test_job_status_queued(self):
        """Should represent queued job status"""
        status = JobStatus(job_id="job_123", state=JobState.queued)
        assert status.job_id == "job_123"
        assert status.state == JobState.queued
        assert status.error is None
        assert status.result is None

    def test_job_status_finished_with_result(self):
        """Should represent finished job with result"""
        result = ClipResult(
            job_id="job_123",
            url="https://storage.example.com/clips/abc123.mp4",
            size_bytes=1024000,
            filename="clip.mp4",
        )
        status = JobStatus(job_id="job_123", state=JobState.finished, result=result)
        assert status.state == JobState.finished
        assert status.result == result
        assert status.error is None

    def test_job_status_failed_with_error(self):
        """Should represent failed job with error message"""
        status = JobStatus(
            job_id="job_123",
            state=JobState.failed,
            error="ffmpeg transcoding failed: invalid codec",
        )
        assert status.state == JobState.failed
        assert status.error == "ffmpeg transcoding failed: invalid codec"
        assert status.result is None
