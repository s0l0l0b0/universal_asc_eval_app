import csv
import json
from io import StringIO
from datetime import datetime
from typing import List, Dict

def generate_batch_csv(results: List[Dict]) -> StringIO:
    """Generates a CSV file from batch results in memory."""
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(["Filename", "Status", "Predicted Class", "Confidence", "Error Message"])

    # Write data rows
    for item in results:
        pred = item.get("prediction") or {}
        writer.writerow([
            item.get("filename"),
            item.get("status"),
            pred.get("predicted_class"),
            pred.get("confidence"),
            item.get("error_message")
        ])
    
    output.seek(0)
    return output

def generate_evaluation_html(eval_data: Dict, ai_summary_html: str) -> str:
    """Generates a self-contained HTML report from evaluation data and AI summary."""
    
    # Simple CSS for styling
    styles = """
    <style>
        body { font-family: sans-serif; margin: 2em; background-color: #f4f4f9; }
        h1, h2 { color: #333; }
        .container { max-width: 960px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .report-section { margin-bottom: 2em; }
        pre { background: #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
    """

    # Basic HTML structure
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Model Evaluation Report</title>
        {styles}
    </head>
    <body>
        <div class="container">
            <h1>Model Evaluation Report</h1>
            <p>Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            
            <div class="report-section">
                <h2>AI-Powered Analysis</h2>
                {ai_summary_html}
            </div>
            
            <div class="report-section">
                <h2>Overall Metrics</h2>
                <p><strong>Overall Accuracy:</strong> {eval_data.get('overall_accuracy', 0):.2%}</p>
                <h3>Dataset Statistics</h3>
                <pre>{json.dumps(eval_data.get('dataset_statistics', {}), indent=2)}</pre>
            </div>

            <div class="report-section">
                <h2>Confusion Matrix</h2>
                <p>Rows are True Labels, Columns are Predicted Labels</p>
                <pre>{json.dumps(eval_data.get('confusion_matrix', []), indent=2)}</pre>
            </div>

            <div class="report-section">
                <h2>Classification Report</h2>
                <pre>{json.dumps(eval_data.get('classification_report', {}), indent=2)}</pre>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content