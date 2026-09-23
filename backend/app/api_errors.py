"""Structured API errors and the route adapter that returns them at the body root."""

from typing import Union

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel

from .schemas.errors import ApiErrorResponse


class FastAPIValidationError(BaseModel):
    loc: list[Union[str, int]]
    msg: str
    type: str


class FastAPIValidationErrorResponse(BaseModel):
    detail: list[FastAPIValidationError] | None = None


class ApiError(Exception):
    """An API error carrying a validated domain error body and HTTP status."""

    def __init__(self, status_code: int, response: ApiErrorResponse):
        self.status_code = status_code
        self.response = response
        super().__init__(response.message)


class StructuredErrorRoute(APIRoute):
    """Return ApiError bodies directly, without FastAPI's ``detail`` wrapper."""

    def get_route_handler(self):
        original_handler = super().get_route_handler()

        async def structured_handler(request: Request) -> Response:
            try:
                return await original_handler(request)
            except ApiError as error:
                return JSONResponse(
                    status_code=error.status_code,
                    content=error.response.model_dump(mode="json"),
                )

        return structured_handler


class ApiRouter(APIRouter):
    """Router using the shared structured-error response adapter."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("route_class", StructuredErrorRoute)
        super().__init__(*args, **kwargs)


def error_responses(error_model: type[ApiErrorResponse], *status_codes: int) -> dict:
    """Build OpenAPI response entries, retaining FastAPI validation-error docs for 422."""
    responses = {}
    for status_code in status_codes:
        model = (
            Union[error_model, FastAPIValidationErrorResponse]
            if status_code == 422
            else error_model
        )
        responses[status_code] = {"model": model}
    return responses
