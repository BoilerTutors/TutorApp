from sqlalchemy.orm import Session
from app.models import TutorReport
from app.schemas import ReportCreate
 
 
def create_report(db: Session, reporter_id: int, data: ReportCreate) -> TutorReport:
    """Create a new tutor report filed by a student."""
    report = TutorReport(
        reporter_id=reporter_id,
        tutor_id=data.tutor_id,
        session_id=data.session_id,
        reason=data.reason,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
 
 
def get_reports_by_reporter(db: Session, reporter_id: int) -> list[TutorReport]:
    """Get all reports filed by a specific student."""
    return (
        db.query(TutorReport)
        .filter(TutorReport.reporter_id == reporter_id)
        .order_by(TutorReport.created_at.desc())
        .all()
    )