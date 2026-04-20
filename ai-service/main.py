from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from src.config import load_config, get_config, get_base_dir
from src.logger import setup_logger
from src.rubric_loader import load_rubric, validate_rubric
from src.blind_processor import mask_pii, check_bias_risk
from src.evaluator import evaluate
from src.calibrator import load_profile
from src.feedback_generator import generate_feedback

load_config(str(Path(__file__).parent / "config.yaml"))
setup_logger()

app = FastAPI(title="KBrain-AX AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RUBRIC_DIR = Path(__file__).parent / "rubrics"


class EvaluateRequest(BaseModel):
    text: str
    rubric: str = "ax_training.yaml"
    applicant_name: str = "미상"
    blind_mode: bool = True
    include_feedback: bool = True


@app.post("/evaluate")
async def evaluate_application(req: EvaluateRequest):
    config = get_config()

    rubric_path = RUBRIC_DIR / req.rubric
    if not rubric_path.exists():
        raise HTTPException(status_code=404, detail=f"루브릭 없음: {req.rubric}")

    rubric = load_rubric(str(rubric_path))
    validate_rubric(rubric)

    bias_flags = check_bias_risk(rubric)
    eval_text = req.text
    pii_map = {}

    if req.blind_mode:
        eval_text, pii_map = mask_pii(req.text, config)

    calibration = load_profile()
    result = evaluate(
        text=eval_text,
        rubric=rubric,
        calibration_profile=calibration,
        applicant_name=req.applicant_name,
        blind_mode=req.blind_mode,
        bias_flags=bias_flags,
    )

    feedback = None
    if req.include_feedback:
        fb = generate_feedback(result)
        feedback = {
            "summary": fb.feedback_summary,
            "strengths": fb.strengths,
            "improvements": fb.improvements,
            "questions": fb.follow_up_questions,
        }

    return {
        "applicant_name": result.applicant_name,
        "rubric_name": result.rubric_name,
        "total_score": result.total_score,
        "max_total": result.max_total,
        "percentage": round(result.total_score / result.max_total * 100, 1) if result.max_total else 0,
        "item_scores": [
            {
                "item_name": s.item_name,
                "section_name": s.section_name,
                "score": s.score,
                "max_score": s.max_score,
                "anchor_range": s.anchor_range,
                "scoring_rationale": s.scoring_rationale,
                "deduction_rationale": s.deduction_rationale,
                "evidence_quotes": s.evidence_quotes,
                "academic_justification": s.academic_justification,
            }
            for s in result.item_scores
        ],
        "strengths_top3": result.strengths_top3,
        "improvements_top3": result.improvements_top3,
        "follow_up_questions": result.follow_up_questions,
        "feedback": feedback,
    }


@app.get("/rubrics")
async def list_rubrics():
    return [f.name for f in RUBRIC_DIR.glob("*.yaml") if not f.name.startswith("_")]


@app.get("/health")
async def health():
    return {"status": "ok"}
