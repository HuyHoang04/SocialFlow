# app/providers/key_rotator.py
"""
Round-robin API key rotator with auto-cooldown on rate limits.
Supports multiple OpenRouter (or any provider) API keys.
"""
import time
import asyncio
from typing import List, Dict, Optional
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class KeyRotator:
    """Thread-safe round-robin key rotation with rate-limit cooldown."""

    def __init__(self, keys: List[str], cooldown_seconds: int = 60):
        """
        Args:
            keys: List of API keys to rotate through
            cooldown_seconds: How long to cool down a rate-limited key (default 60s)
        """
        if not keys:
            raise ValueError("KeyRotator requires at least 1 API key")

        # Deduplicate while preserving order
        seen = set()
        unique_keys = []
        for k in keys:
            k = k.strip()
            if k and k not in seen:
                seen.add(k)
                unique_keys.append(k)

        self.keys = unique_keys
        self.cooldown_seconds = cooldown_seconds
        self._current_index = 0
        self._cooldowns: Dict[int, float] = {}  # key_index -> cooldown_until_timestamp
        self._request_counts: Dict[int, int] = {i: 0 for i in range(len(self.keys))}
        self._error_counts: Dict[int, int] = {i: 0 for i in range(len(self.keys))}
        self._lock = asyncio.Lock()

        logger.info(f"KeyRotator initialized with {len(self.keys)} key(s), cooldown={cooldown_seconds}s")
        for i, key in enumerate(self.keys):
            masked = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
            logger.info(f"  Key {i}: {masked}")

    def get_next_key(self) -> str:
        """Get the next available key using round-robin, skipping cooled-down keys."""
        now = time.time()
        attempts = 0

        while attempts < len(self.keys):
            idx = self._current_index % len(self.keys)
            self._current_index = (self._current_index + 1) % len(self.keys)

            # Check if this key is in cooldown
            cooldown_until = self._cooldowns.get(idx, 0)
            if now >= cooldown_until:
                # Key is available
                self._request_counts[idx] = self._request_counts.get(idx, 0) + 1
                masked = f"{self.keys[idx][:8]}..." if len(self.keys[idx]) > 8 else "***"
                logger.info(f"KeyRotator: Using key {idx} ({masked}) | Requests: {self._request_counts[idx]}")
                return self.keys[idx]

            # Key is cooling down, try next
            remaining = cooldown_until - now
            logger.info(f"KeyRotator: Key {idx} is cooling down ({remaining:.0f}s remaining), trying next...")
            attempts += 1

        # All keys are in cooldown — use the one with earliest cooldown expiry
        earliest_idx = min(self._cooldowns, key=self._cooldowns.get, default=0)
        wait_time = max(0, self._cooldowns.get(earliest_idx, 0) - now)
        logger.warning(f"KeyRotator: ALL keys in cooldown! Using key {earliest_idx} (wait {wait_time:.0f}s)")
        self._request_counts[earliest_idx] = self._request_counts.get(earliest_idx, 0) + 1
        return self.keys[earliest_idx]

    def mark_rate_limited(self, key: str):
        """Mark a key as rate-limited, putting it in cooldown."""
        try:
            idx = self.keys.index(key)
        except ValueError:
            logger.warning(f"KeyRotator: Attempted to mark unknown key as rate-limited")
            return

        self._cooldowns[idx] = time.time() + self.cooldown_seconds
        self._error_counts[idx] = self._error_counts.get(idx, 0) + 1
        masked = f"{key[:8]}..." if len(key) > 8 else "***"
        logger.warning(
            f"KeyRotator: Key {idx} ({masked}) rate-limited! "
            f"Cooldown {self.cooldown_seconds}s | Total errors: {self._error_counts[idx]}"
        )

    def mark_error(self, key: str):
        """Track an error for a key without putting it in cooldown."""
        try:
            idx = self.keys.index(key)
        except ValueError:
            return
        self._error_counts[idx] = self._error_counts.get(idx, 0) + 1

    def reset_cooldowns(self):
        """Reset all cooldowns (manual recovery)."""
        self._cooldowns.clear()
        logger.info("KeyRotator: All cooldowns reset")

    def get_status(self) -> Dict:
        """Get status of all keys."""
        now = time.time()
        keys_status = []
        for i, key in enumerate(self.keys):
            masked = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
            cooldown_until = self._cooldowns.get(i, 0)
            is_cooling = now < cooldown_until
            remaining = max(0, cooldown_until - now) if is_cooling else 0

            keys_status.append({
                "index": i,
                "key_masked": masked,
                "status": "cooldown" if is_cooling else "active",
                "cooldown_remaining_seconds": round(remaining),
                "total_requests": self._request_counts.get(i, 0),
                "total_errors": self._error_counts.get(i, 0),
            })

        active_count = sum(1 for s in keys_status if s["status"] == "active")
        return {
            "total_keys": len(self.keys),
            "active_keys": active_count,
            "cooldown_keys": len(self.keys) - active_count,
            "cooldown_seconds": self.cooldown_seconds,
            "keys": keys_status,
        }
