"""Bounded, per-database caching for safe repeated API reads."""

from concurrent.futures import Future
from copy import deepcopy
from functools import wraps
from inspect import signature
from pathlib import Path
from threading import RLock
from typing import Callable, TypeVar

from cachetools import TTLCache

from .db import get_active_db_path

T = TypeVar("T")

READ_CACHE_TTL_SECONDS = 60
READ_CACHE_MAXSIZE = 1024

_LOCK = RLock()
_CACHES: dict[str, TTLCache] = {}
_GENERATIONS: dict[tuple[str, str], int] = {}
_IN_FLIGHT: dict[tuple[str, tuple[str, object]], Future] = {}


def _database_key(db_path: Path | str | None = None) -> str:
    path = get_active_db_path() if db_path is None else Path(db_path)
    return str(path.resolve())


def _freeze(value):
    """Return a deterministic cache-key value, rejecting request/context objects."""
    if value is None or isinstance(value, (bool, int, float, str, bytes)):
        return value
    if isinstance(value, (tuple, list)):
        return tuple(_freeze(item) for item in value)
    if isinstance(value, dict):
        return tuple(sorted((_freeze(key), _freeze(item)) for key, item in value.items()))
    raise TypeError(f"Unsupported cache-key value: {type(value).__name__}")


def cached_read(namespace: str, key: object, loader: Callable[[], T]) -> T:
    """Return a cached read or load it once for concurrent callers.

    The active database path is always part of the key. Values are copied at both
    boundaries so callers cannot mutate the shared cached object.
    """
    db_key = _database_key()
    frozen_key = _freeze(key)
    cache_key = (db_key, frozen_key)
    flight_key = (namespace, cache_key)
    generation_key = (namespace, db_key)

    while True:
        with _LOCK:
            cache = _CACHES.get(namespace)
            if cache is None:
                cache = TTLCache(maxsize=READ_CACHE_MAXSIZE, ttl=READ_CACHE_TTL_SECONDS)
                _CACHES[namespace] = cache
            try:
                return deepcopy(cache[cache_key])
            except KeyError:
                pass

            generation = _GENERATIONS.setdefault(generation_key, 0)
            future = _IN_FLIGHT.get(flight_key)
            is_loader = future is None
            if is_loader:
                future = Future()
                _IN_FLIGHT[flight_key] = future

        if not is_loader:
            result_generation, result = future.result()
            with _LOCK:
                if _GENERATIONS.get(generation_key, 0) == result_generation:
                    return deepcopy(result)
            # A successful write invalidated the in-flight read. Retry against
            # the post-write database state rather than returning its stale value.
            continue

        try:
            result = loader()
            stored_result = deepcopy(result)
        except BaseException as error:
            with _LOCK:
                _IN_FLIGHT.pop(flight_key, None)
                future.set_exception(error)
            raise

        with _LOCK:
            if _GENERATIONS.get(generation_key, 0) == generation:
                cache[cache_key] = stored_result
            _IN_FLIGHT.pop(flight_key, None)
            future.set_result((generation, stored_result))
        return deepcopy(result)


def invalidate_cache(db_path: Path | str | None = None) -> None:
    """Invalidate every cached read for one database after a successful write."""
    db_key = _database_key(db_path)
    with _LOCK:
        namespaces = set(_CACHES)
        namespaces.update(namespace for namespace, path in _GENERATIONS if path == db_key)
        for namespace in namespaces:
            generation_key = (namespace, db_key)
            _GENERATIONS[generation_key] = _GENERATIONS.get(generation_key, 0) + 1
            cache = _CACHES.get(namespace)
            if cache is not None:
                for cache_key in tuple(cache.keys()):
                    if cache_key[0] == db_key:
                        del cache[cache_key]


def cached_get(namespace: str):
    """Cache a synchronous GET handler using its arguments as part of the key."""
    def decorate(function):
        function_signature = signature(function)

        @wraps(function)
        def wrapped(*args, **kwargs):
            try:
                bound = function_signature.bind(*args, **kwargs)
                arguments = tuple(
                    (name, _freeze(value)) for name, value in bound.arguments.items()
                )
            except TypeError:
                # A new request/context-dependent parameter is deliberately not
                # cacheable unless it can be represented safely in the key.
                return function(*args, **kwargs)

            key = (function.__module__, function.__qualname__, arguments)
            return cached_read(namespace, key, lambda: function(*args, **kwargs))

        return wrapped

    return decorate
