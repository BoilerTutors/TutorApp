import os
from typing import Any

import boto3


def get_textract_client():
    return boto3.client(
        "textract",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )


def start_transcript_analysis(bucket: str, s3_key: str) -> str:
    """Start async Textract table/text analysis for a transcript PDF in S3."""
    textract = get_textract_client()
    response = textract.start_document_analysis(
        DocumentLocation={
            "S3Object": {
                "Bucket": bucket,
                "Name": s3_key,
            }
        },
        FeatureTypes=["TABLES"],
    )
    return response["JobId"]


def get_transcript_analysis(job_id: str) -> dict[str, Any]:
    """Fetch all Textract pages for a completed or in-progress async job."""
    textract = get_textract_client()
    blocks: list[dict[str, Any]] = []
    next_token: str | None = None
    job_status = "IN_PROGRESS"

    while True:
        kwargs: dict[str, Any] = {"JobId": job_id}
        if next_token:
            kwargs["NextToken"] = next_token

        response = textract.get_document_analysis(**kwargs)
        job_status = response["JobStatus"]
        blocks.extend(response.get("Blocks", []))

        next_token = response.get("NextToken")
        if job_status != "SUCCEEDED" or not next_token:
            break

    return {
        "job_status": job_status,
        "status_message": response.get("StatusMessage"),
        "warnings": response.get("Warnings", []),
        "blocks": blocks,
        "document_metadata": response.get("DocumentMetadata", {}),
    }


def build_llm_transcript_context(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    """Convert Textract blocks into compact line/table context for LLM verification."""
    block_by_id = {block["Id"]: block for block in blocks if "Id" in block}
    lines = [
        {
            "page_number": block.get("Page"),
            "text": block.get("Text", ""),
            "confidence": block.get("Confidence"),
        }
        for block in blocks
        if block.get("BlockType") == "LINE" and block.get("Text")
    ]

    tables = []
    for table in (block for block in blocks if block.get("BlockType") == "TABLE"):
        cells = _table_cells(table, block_by_id)
        if cells:
            tables.append(
                {
                    "page_number": table.get("Page"),
                    "rows": _cells_to_rows(cells, block_by_id),
                    "confidence": table.get("Confidence"),
                }
            )

    return {
        "lines": lines,
        "tables": tables,
    }


def _table_cells(
    table: dict[str, Any],
    block_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    for relationship in table.get("Relationships", []):
        if relationship.get("Type") != "CHILD":
            continue
        for child_id in relationship.get("Ids", []):
            child = block_by_id.get(child_id)
            if child and child.get("BlockType") == "CELL":
                cells.append(child)
    return cells


def _cells_to_rows(
    cells: list[dict[str, Any]],
    block_by_id: dict[str, dict[str, Any]],
) -> list[list[str]]:
    max_row = max((cell.get("RowIndex", 0) for cell in cells), default=0)
    max_col = max((cell.get("ColumnIndex", 0) for cell in cells), default=0)
    rows = [["" for _ in range(max_col)] for _ in range(max_row)]

    for cell in cells:
        row_index = cell.get("RowIndex", 1) - 1
        col_index = cell.get("ColumnIndex", 1) - 1
        rows[row_index][col_index] = _cell_text(cell, block_by_id)

    return rows


def _cell_text(
    cell: dict[str, Any],
    block_by_id: dict[str, dict[str, Any]],
) -> str:
    text_parts: list[str] = []
    for relationship in cell.get("Relationships", []):
        if relationship.get("Type") != "CHILD":
            continue
        for child_id in relationship.get("Ids", []):
            child = block_by_id.get(child_id)
            if not child:
                continue
            if child.get("BlockType") == "WORD" and child.get("Text"):
                text_parts.append(child["Text"])
            elif child.get("BlockType") == "SELECTION_ELEMENT":
                text_parts.append(child.get("SelectionStatus", ""))
    return " ".join(text_parts)
