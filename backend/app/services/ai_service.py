import litellm
import re
from app.core.config import settings
from app.models.evaluation_schemas import EvaluationResponse
# litellm._turn_on_debug()

# This code runs only ONCE when the server starts.
# print("\n--- [STARTUP DEBUG] Reading API Keys from Settings ---")
# print(f"OpenAI Key Loaded:    '{settings.OPENAI_API_KEY}'")
# print(f"Anthropic Key Loaded: '{settings.ANTHROPIC_API_KEY}'")
# print(f"DeepSeek Key Loaded:  '{settings.DEEPSEEK_API_KEY}'")
# print("------------------------------------------------------\n")

PROVIDER_MODELS = {
    "openai": "gpt-4o",
    "anthropic": "claude-3-haiku-20240307",
    "deepseek": "deepseek/deepseek-chat"
}

PROVIDER_KEYS = {
    "openai": settings.OPENAI_API_KEY,
    "anthropic": settings.ANTHROPIC_API_KEY,
    "deepseek": settings.DEEPSEEK_API_KEY
}

class AIServiceError(Exception):
    """Custom exception for AI service errors."""
    pass

# --- Function 1: For Full Dataset Evaluation Reports ---

def _construct_full_report_prompt(report: EvaluationResponse) -> str:
    """Builds a detailed prompt for the LLM based on a full evaluation report."""
    class_labels = [k for k in report.classification_report.keys() if k not in ['accuracy', 'macro avg', 'weighted avg']]
    prompt = f"""
    You are an expert Machine Learning engineer. Analyze the following model evaluation report and provide a comprehensive, actionable summary in HTML.

    **Model Evaluation Report:**
    - **Overall Accuracy:** {report.overall_accuracy:.2%}
    - **Class Labels:** {class_labels}
    - **Confusion Matrix:** {report.confusion_matrix}
    - **Classification Report:** {report.classification_report}

    **Your Task:**
    Generate an HTML report with <h2> titles for "Overall Performance", "Strengths", "Weaknesses", and "Actionable Recommendations".
    IMPORTANT: Do not use Markdown, code blocks, backticks, or <pre> tags. Use standard HTML like <ul> and <li> for lists.
    """
    return prompt

async def generate_summary(request_data: EvaluationResponse, provider: str) -> str:
    """Generates an intelligent summary for a full evaluation report."""
    provider_key = PROVIDER_KEYS.get(provider.lower())
    if not provider_key or provider_key == "default_key_if_not_set":
        raise AIServiceError(f"API key for '{provider}' not configured in the .env file.")

    model_name = PROVIDER_MODELS.get(provider.lower())
    if not model_name:
        raise AIServiceError(f"Unsupported AI provider: {provider}")

    prompt = _construct_full_report_prompt(request_data)

    try:
        response = await litellm.acompletion(
            model=model_name,
            messages=[{"content": prompt, "role": "user"}],
            api_key=provider_key
        )
        summary = response.choices[0].message.content
        
        # Robustly clean the AI's response
        cleaned_summary = re.sub(r"^\s*`{3}(html)?\s*|\s*`{3}\s*$", "", summary).strip()
        cleaned_summary = re.sub(r'</?(pre|code)[^>]*>', '', cleaned_summary)
        return cleaned_summary
    except Exception as e:
        raise AIServiceError(f"Failed to get summary from {provider}: {e}")

# --- Function 2: For Simple Batch Processing Summaries ---

def _construct_batch_summary_prompt(results: list) -> str:
    """Builds a prompt for the LLM to summarize a list of predictions."""
    predictions = [
        {"filename": item.get("filename"), "predicted_class": item.get("prediction", {}).get("predicted_class")}
        for item in results if item.get("status") == "success"
    ]
    prompt = f"""
    You are an expert Machine Learning engineer. Analyze the following list of audio file predictions from a batch run and provide a brief, qualitative summary in HTML.

    **Prediction Results:**
    {predictions}

    **Your Task:**
    Generate an HTML summary with <h2> titles for "Batch Overview" and "Key Observations".
    IMPORTANT: Do not use Markdown, code blocks, backticks, or <pre> tags. Use standard HTML like <ul> and <li> for lists.
    """
    return prompt

async def generate_batch_summary(results: list, provider: str) -> str:
    """Generates a qualitative summary for a list of batch predictions."""
    provider_key = PROVIDER_KEYS.get(provider.lower())
    if not provider_key or provider_key == "default_key_if_not_set":
        raise AIServiceError(f"API key for '{provider}' not configured in the .env file.")

    model_name = PROVIDER_MODELS.get(provider.lower())
    if not model_name:
        raise AIServiceError(f"Unsupported AI provider: {provider}")

    prompt = _construct_batch_summary_prompt(results)

    try:
        response = await litellm.acompletion(
            model=model_name,
            messages=[{"content": prompt, "role": "user"}],
            api_key=provider_key
        )
        summary = response.choices[0].message.content

        # Robustly clean the AI's response
        cleaned_summary = re.sub(r"^\s*`{3}(html)?\s*|\s*`{3}\s*$", "", summary).strip()
        cleaned_summary = re.sub(r'</?(pre|code)[^>]*>', '', cleaned_summary)
        return cleaned_summary
    except Exception as e:
        raise AIServiceError(f"Failed to get summary from {provider}: {e}")