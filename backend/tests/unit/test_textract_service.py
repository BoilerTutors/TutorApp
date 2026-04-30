from app.services.textract import build_llm_transcript_context


def test_build_llm_transcript_context_extracts_lines_and_table_rows():
    blocks = [
        {
            "BlockType": "LINE",
            "Id": "line-1",
            "Page": 1,
            "Text": "Purdue University",
            "Confidence": 99.0,
        },
        {
            "BlockType": "TABLE",
            "Id": "table-1",
            "Page": 1,
            "Confidence": 98.0,
            "Relationships": [{"Type": "CHILD", "Ids": ["cell-1", "cell-2"]}],
        },
        {
            "BlockType": "CELL",
            "Id": "cell-1",
            "RowIndex": 1,
            "ColumnIndex": 1,
            "Relationships": [{"Type": "CHILD", "Ids": ["word-1", "word-2"]}],
        },
        {
            "BlockType": "CELL",
            "Id": "cell-2",
            "RowIndex": 1,
            "ColumnIndex": 2,
            "Relationships": [{"Type": "CHILD", "Ids": ["word-3"]}],
        },
        {"BlockType": "WORD", "Id": "word-1", "Text": "CS"},
        {"BlockType": "WORD", "Id": "word-2", "Text": "18000"},
        {"BlockType": "WORD", "Id": "word-3", "Text": "A"},
    ]

    context = build_llm_transcript_context(blocks)

    assert context["lines"] == [
        {
            "page_number": 1,
            "text": "Purdue University",
            "confidence": 99.0,
        }
    ]
    assert context["tables"] == [
        {
            "page_number": 1,
            "rows": [["CS 18000", "A"]],
            "confidence": 98.0,
        }
    ]
