import litellm
from app.core.config import settings
from app.models.evaluation_schemas import EvaluationResponse

# REQ-SW-003: Map our provider names to the model strings LiteLLM expects
PROVIDER_MODELS = {
    "openai": "gpt-4o",
    "anthropic": "claude-3-haiku-20240307",
    "deepseek": "deepseek/deepseek-chat"
}

class AIServiceError(Exception):
    """Custom exception for AI service errors."""
    pass

def _construct_prompt(report: EvaluationResponse) -> str:
    """Builds a detailed prompt for the LLM based on the evaluation report."""
    
    # Get class labels from the classification report keys
    class_labels = [k for k in report.classification_report.keys() if k not in ['accuracy', 'macro avg', 'weighted avg']]

    prompt = f"""
    You are an expert Machine Learning engineer specializing in audio classification.
    Analyze the following model evaluation report and provide a comprehensive, actionable summary.

    **Model Evaluation Report:**
    - **Overall Accuracy:** {report.overall_accuracy:.2%}
    - **Class Labels:** {class_labels}
    - **Dataset Statistics:** {report.dataset_statistics}
    - **Confusion Matrix:**
      (Rows are True Labels, Columns are Predicted Labels)
      {report.confusion_matrix}
    - **Classification Report (Per-Class Metrics):**
      {report.classification_report}

    **Your Task:**
    Generate an HTML-formatted report with the following sections. Use <h2> for titles and <p> or <ul>/<li> for content.

    1.  **<h2>Overall Performance Summary</h2>**
        <p>A brief, high-level conclusion about the model's performance. Is it production-ready? Does it perform well overall?</p>

    2.  **<h2>Strengths</h2>**
        <p>Identify the classes the model performs best on. Use the high F1-scores and the diagonal of the confusion matrix to support your claims.</p>

    3.  **<h2>Weaknesses & Confusions</h2>**
        <p>Identify the classes the model struggles with (low recall/precision). Point out specific, significant confusions from the confusion matrix (e.g., "The model frequently misclassifies 'Class_A' as 'Class_B'").</p>

    4.  **<h2>Actionable Recommendations</h2>**
        <p>Suggest concrete, specific steps for model improvement based on your analysis. For example:
        <ul>
            <li>'Collect more data for classes with low recall, such as [class name].'</li>
            <li>'Consider data augmentation techniques like noise injection or time stretching to improve generalization.'</li>
            <li>'Investigate the feature representation for commonly confused classes [class A] and [class B] as they might be acoustically similar.'</li>
        </ul>
        </p>

    Format the output as a single, clean block of HTML.
    """
    return prompt

def _construct_batch_summary_prompt(results: list) -> str:
    """Builds a prompt for the LLM to summarize a list of predictions."""
    
    # Extract just the filenames and predicted classes for a cleaner prompt
    predictions = [
        {"filename": item.get("filename"), "predicted_class": item.get("prediction", {}).get("predicted_class")}
        for item in results if item.get("status") == "success"
    ]
    
    prompt = f"""
    You are an expert Machine Learning engineer.
    Analyze the following list of audio file predictions from a batch processing run and provide a brief, qualitative summary.

    **Prediction Results:**
    {predictions}

    **Your Task:**
    Generate a simple HTML-formatted summary with the following sections. Use <h2> for titles and <ul>/<li> for content.

    1.  **<h2>Batch Overview</h2>**
        <p>Provide a high-level summary. How many files were processed successfully? What were the most common predictions?</p>

    2.  **<h2>Key Observations</h2>**
        <p>Are there any interesting patterns? For example, do files with similar names get similar predictions? Mention any potential trends you see in the predictions.</p>

    Format the output as a single, clean block of HTML.
    """
    return prompt


async def generate_summary(request_data: EvaluationResponse, provider: str) -> str:
    """
    Generates an intelligent evaluation summary using an external AI service.
    """
    if provider.lower() not in PROVIDER_MODELS:
        raise AIServiceError(f"Unsupported AI provider. Supported providers are: {list(PROVIDER_MODELS.keys())}")
    
    # Set the API key for the chosen provider for LiteLLM
    if provider == "openai":
        litellm.api_key = settings.OPENAI_API_KEY
    elif provider == "anthropic":
        litellm.api_key = settings.ANTHROPIC_API_KEY
    elif provider == "deepseek":
        litellm.api_key = settings.DEEPSEEK_API_KEY

    prompt = _construct_prompt(request_data)
    model_name = PROVIDER_MODELS[provider.lower()]

    try:
        # REQ-005-2: Generate summary using external AI service
        response = await litellm.acompletion(
            model=model_name,
            messages=[{"content": prompt, "role": "user"}]
        )
        summary = response.choices[0].message.content
        return summary
    except Exception as e:
        # REQ-005-1: Handle API failures gracefully
        raise AIServiceError(f"Failed to get summary from {provider}: {e}")