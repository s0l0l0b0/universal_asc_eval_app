from fastapi import APIRouter, Body
from fastapi.responses import Response, JSONResponse, HTMLResponse
from datetime import datetime
import json

from app.services import export_service
from app.models.export_schemas import BatchExportRequest, EvaluationExportRequest

router = APIRouter()

@router.post("/batch", tags=["Data Export"])
def export_batch_results(
    request: BatchExportRequest,
    format: str = "csv"
):
    """
    Exports batch classification results in the specified format (csv or json).
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    results_dict = [result.model_dump() for result in request.results]

    if format.lower() == "csv":
        # REQ-006-1: Export batch results in CSV format
        csv_file = export_service.generate_batch_csv(results_dict)
        return Response(
            content=csv_file.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=batch_results_{timestamp}.csv"}
        )
    elif format.lower() == "json":
        # REQ-006-1: Export batch results in JSON format
        json_content = json.dumps(results_dict, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=batch_results_{timestamp}.json"}
        )
    else:
        return JSONResponse(status_code=400, content={"detail": "Unsupported format. Use 'csv' or 'json'."})

@router.post("/evaluation", tags=["Data Export"])
def export_evaluation_report(
    request: EvaluationExportRequest
):
    """
    Generates and returns a comprehensive HTML evaluation report.
    """
    # REQ-006-2: Generate comprehensive HTML evaluation reports
    html_content = export_service.generate_evaluation_html(
        request.evaluation_data.model_dump(),
        request.ai_summary.summary_html
    )
    return HTMLResponse(
        content=html_content,
        headers={"Content-Disposition": "attachment; filename=evaluation_report.html"}
    )