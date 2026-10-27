"""Bounded list responses.

Every list endpoint used to return its whole result set. For a long-lived child
record — audit trail, observations, messages — that is an unbounded query, an
unbounded serialization and an unbounded render, all driven by data the caller
does not control. These page by default and cap how much one request can ask for.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BoundedPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "required": ["count", "results"],
            "properties": {
                "count": {"type": "integer"},
                "next": {"type": "string", "nullable": True, "format": "uri"},
                "previous": {"type": "string", "nullable": True, "format": "uri"},
                "results": schema,
            },
        }
