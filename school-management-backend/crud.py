import hashlib
import json

from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

import models
import schemas

DAYS_MONDAY_TO_FRIDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
FORM_OPTIONS = [f"Form {index}" for index in range(1, 8)]
TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"]
SECONDARY_SUBJECTS = [
    "Agriculture",
    "Additional Mathematics",
    "Bible Knowledge",
    "Biology",
    "Business Studies",
    "Chichewa",
    "Chemistry",
    "Computer Studies",
    "English Language",
    "French",
    "Geography",
    "History",
    "Home Economics",
    "Life Skills",
    "Literature in English",
    "Mathematics",
    "Music",
    "Physical Education",
    "Physics",
    "Social and Development Studies",
    "Technical Drawing",
]
SUBJECT_LOOKUP = {subject.casefold(): subject for subject in SECONDARY_SUBJECTS}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def ensure_schema(db: Session) -> None:
    inspector = inspect(db.bind)
    exam_columns = {column["name"] for column in inspector.get_columns("exam_records")}
    if "subject_scores" not in exam_columns:
        db.execute(text("ALTER TABLE exam_records ADD COLUMN subject_scores TEXT"))
        db.commit()


def normalize_spaces(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def normalize_form(value: str | None) -> str | None:
    cleaned = normalize_spaces(value)
    if not cleaned:
        return None
    compact = cleaned.casefold().replace(" ", "")
    if compact.startswith("form"):
        number = compact.replace("form", "")
        if number.isdigit() and 1 <= int(number) <= 7:
            return f"Form {int(number)}"
    return cleaned.title()


def normalize_term(value: str | None) -> str | None:
    cleaned = normalize_spaces(value)
    if not cleaned:
        return None
    lowered = cleaned.casefold()
    for option in TERM_OPTIONS:
        if lowered == option.casefold():
            return option
    digits = "".join(character for character in lowered if character.isdigit())
    if digits in {"1", "2", "3"}:
        return f"Term {digits}"
    return cleaned.title()


def normalize_sex(value: str | None) -> str | None:
    cleaned = normalize_spaces(value)
    if not cleaned:
        return None
    lowered = cleaned.casefold()
    if lowered.startswith("m"):
        return "M"
    if lowered.startswith("f"):
        return "F"
    return cleaned.upper()


def normalize_subject(value: str | None) -> str | None:
    cleaned = normalize_spaces(value)
    if not cleaned:
        return None
    return SUBJECT_LOOKUP.get(cleaned.casefold(), cleaned.title())


def normalize_person_name(value: str | None) -> str | None:
    cleaned = normalize_spaces(value)
    return cleaned.title() if cleaned else None


def normalize_student_payload(payload: schemas.StudentBase) -> dict:
    data = payload.model_dump()
    data["full_name"] = normalize_person_name(data["full_name"])
    data["sex"] = normalize_sex(data["sex"])
    data["class_name"] = normalize_form(data["class_name"])
    data["guardian_name"] = normalize_person_name(data.get("guardian_name"))
    data["guardian_contact"] = normalize_spaces(data.get("guardian_contact"))
    data["address"] = normalize_spaces(data.get("address"))
    data["admission_number"] = normalize_spaces(data.get("admission_number"))
    return data


def normalize_teacher_payload(payload: schemas.TeacherBase) -> dict:
    data = payload.model_dump()
    data["full_name"] = normalize_person_name(data["full_name"])
    data["sex"] = normalize_sex(data.get("sex"))
    data["subject"] = normalize_subject(data["subject"]) or "General"
    data["phone"] = normalize_spaces(data.get("phone"))
    data["email"] = normalize_spaces(data.get("email"))
    data["qualification"] = normalize_spaces(data.get("qualification"))
    return data


def build_subject_scores(payload: schemas.ExamRecordBase) -> list[dict]:
    scores = []
    for item in payload.subject_scores:
        subject = normalize_subject(item.subject)
        if not subject:
            continue
        scores.append({"subject": subject, "score": float(item.score)})
    return scores


def extract_subject_score(subject_scores: list[dict], subject_name: str) -> float:
    for item in subject_scores:
        if item["subject"].casefold() == subject_name.casefold():
            return float(item["score"])
    return 0.0


def subject_scores_for_record(record: models.ExamRecord) -> list[dict]:
    if record.subject_scores:
        try:
            parsed = json.loads(record.subject_scores)
            if isinstance(parsed, list) and parsed:
                return parsed
        except json.JSONDecodeError:
            pass
    fallback = [
        {"subject": "English Language", "score": float(record.english or 0)},
        {"subject": "Mathematics", "score": float(record.mathematics or 0)},
        {"subject": "Biology", "score": float(record.science or 0)},
        {"subject": "Social and Development Studies", "score": float(record.social_studies or 0)},
    ]
    return [item for item in fallback if item["score"] or item["subject"]]


def serialize_exam_record(record: models.ExamRecord) -> dict:
    scores = subject_scores_for_record(record)
    return {
        "id": record.id,
        "student_id": record.student_id,
        "student_name": record.student_name,
        "class_name": record.class_name,
        "exam_name": record.exam_name,
        "term": record.term,
        "subject_scores": scores,
        "english": extract_subject_score(scores, "English Language"),
        "mathematics": extract_subject_score(scores, "Mathematics"),
        "science": extract_subject_score(scores, "Biology"),
        "social_studies": extract_subject_score(scores, "Social and Development Studies"),
        "average": record.average,
        "total_score": record.total_score,
        "result_label": record.result_label,
        "overall_result": record.overall_result,
        "english_failed": record.english_failed,
        "passed": record.passed,
        "rank": record.rank,
    }


def serialize_timetable(timetable: models.Timetable) -> dict:
    return {
        "id": timetable.id,
        "title": timetable.title,
        "timetable_type": timetable.timetable_type,
        "class_name": timetable.class_name,
        "is_posted": timetable.is_posted,
        "note": timetable.note,
        "days": json.loads(timetable.days),
        "entries": timetable.entries,
    }


def get_or_create_default_admin(db: Session) -> models.User:
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if admin:
        return admin

    admin = models.User(
        username="admin",
        password_hash=hash_password("admin123"),
        role="admin",
        status="approved",
        full_name="System Administrator",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def signup_user(db: Session, payload: schemas.UserSignup) -> models.User:
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise ValueError("User already exists")

    status = "approved" if payload.role == "admin" else "pending"
    user = models.User(
        username=normalize_spaces(payload.username),
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=status,
        full_name=normalize_person_name(payload.full_name),
        profile_image=payload.profile_image,
    )
    db.add(user)
    db.flush()

    if payload.role == "teacher":
        teacher = models.Teacher(
            full_name=normalize_person_name(payload.full_name),
            sex=normalize_sex(payload.sex),
            subject=normalize_subject(payload.subject) or "General",
            phone=normalize_spaces(payload.phone),
            email=normalize_spaces(payload.email),
            qualification=normalize_spaces(payload.qualification),
            profile_image=payload.profile_image,
            user_id=user.id,
            approved=False,
        )
        db.add(teacher)

    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, username: str, password: str) -> models.User | None:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or user.password_hash != hash_password(password):
        return None
    return user


def list_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.role.desc(), models.User.full_name.asc()).all()


def list_pending_teachers(db: Session) -> list[models.User]:
    return (
        db.query(models.User)
        .filter(models.User.role == "teacher", models.User.status == "pending")
        .order_by(models.User.full_name.asc())
        .all()
    )


def approve_teacher(db: Session, user_id: int) -> models.User | None:
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "teacher").first()
    if not user:
        return None
    user.status = "approved"
    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == user.id).first()
    if teacher:
        teacher.approved = True
    db.commit()
    db.refresh(user)
    return user


def create_admin(db: Session, payload: schemas.UserSignup) -> models.User:
    return signup_user(db, payload.model_copy(update={"role": "admin"}))


def get_students(db: Session) -> list[models.Student]:
    return db.query(models.Student).order_by(func.lower(models.Student.full_name).asc()).all()


def create_student(db: Session, payload: schemas.StudentCreate) -> models.Student:
    student = models.Student(**normalize_student_payload(payload))
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(db: Session, student_id: int, payload: schemas.StudentUpdate) -> models.Student | None:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        return None
    for field, value in normalize_student_payload(payload).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int) -> bool:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        return False
    db.query(models.Attendance).filter(models.Attendance.student_id == student.id).delete()
    db.query(models.Fee).filter(models.Fee.student_id == student.id).update({"student_id": None})
    db.query(models.ExamRecord).filter(models.ExamRecord.student_id == student.id).update({"student_id": None})
    db.delete(student)
    db.commit()
    return True


def get_teachers(db: Session) -> list[models.Teacher]:
    return db.query(models.Teacher).order_by(func.lower(models.Teacher.full_name).asc()).all()


def create_teacher(db: Session, payload: schemas.TeacherCreate) -> models.Teacher:
    teacher = models.Teacher(**normalize_teacher_payload(payload))
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


def update_teacher(db: Session, teacher_id: int, payload: schemas.TeacherUpdate) -> models.Teacher | None:
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        return None
    for field, value in normalize_teacher_payload(payload).items():
        setattr(teacher, field, value)
    if teacher.user_id:
        user = db.query(models.User).filter(models.User.id == teacher.user_id).first()
        if user:
            user.full_name = teacher.full_name
            user.profile_image = teacher.profile_image
    db.commit()
    db.refresh(teacher)
    return teacher


def get_attendance(db: Session) -> list[models.Attendance]:
    return db.query(models.Attendance).order_by(models.Attendance.date.desc(), models.Attendance.id.desc()).all()


def create_attendance(db: Session, payload: schemas.AttendanceCreate) -> models.Attendance:
    attendance = models.Attendance(**payload.model_dump())
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def update_attendance(db: Session, attendance_id: int, payload: schemas.AttendanceUpdate) -> models.Attendance | None:
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        return None
    for field, value in payload.model_dump().items():
        setattr(attendance, field, value)
    db.commit()
    db.refresh(attendance)
    return attendance


def delete_attendance(db: Session, attendance_id: int) -> bool:
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        return False
    db.delete(attendance)
    db.commit()
    return True


def get_fees(db: Session) -> list[dict]:
    fees = db.query(models.Fee).order_by(func.lower(models.Fee.student_name).asc()).all()
    return [serialize_fee(item) for item in fees]


def serialize_fee(fee: models.Fee) -> dict:
    return {
        "id": fee.id,
        "student_id": fee.student_id,
        "student_name": fee.student_name,
        "expected_amount": fee.expected_amount,
        "amount_paid": fee.amount_paid,
        "fully_paid": fee.fully_paid,
        "note": fee.note,
        "balance": max(fee.expected_amount - fee.amount_paid, 0),
    }


def create_fee(db: Session, payload: schemas.FeeCreate) -> dict:
    data = payload.model_dump()
    data["student_name"] = normalize_person_name(data["student_name"])
    data["note"] = normalize_spaces(data.get("note"))
    fee = models.Fee(**data)
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return serialize_fee(fee)


def update_fee(db: Session, fee_id: int, payload: schemas.FeeUpdate) -> dict | None:
    fee = db.query(models.Fee).filter(models.Fee.id == fee_id).first()
    if not fee:
        return None
    data = payload.model_dump()
    data["student_name"] = normalize_person_name(data["student_name"])
    data["note"] = normalize_spaces(data.get("note"))
    for field, value in data.items():
        setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return serialize_fee(fee)


def delete_fee(db: Session, fee_id: int) -> bool:
    fee = db.query(models.Fee).filter(models.Fee.id == fee_id).first()
    if not fee:
        return False
    db.delete(fee)
    db.commit()
    return True


def score_to_label(score: float) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 50:
        return "Pass"
    return "Failed"


def overall_result_for_record(record: models.ExamRecord) -> tuple[str, bool]:
    english_failed = record.english < 50
    label = score_to_label(record.average)
    if english_failed or record.average < 50:
        return "Failed", english_failed
    return label, english_failed


def recalculate_exam_rankings(db: Session, class_name: str, exam_name: str) -> list[models.ExamRecord]:
    records = (
        db.query(models.ExamRecord)
        .filter(models.ExamRecord.class_name == class_name, models.ExamRecord.exam_name == exam_name)
        .all()
    )

    for record in records:
        parsed_scores = subject_scores_for_record(record)
        scores = [float(item["score"]) for item in parsed_scores]
        record.subject_scores = json.dumps(parsed_scores)
        record.english = extract_subject_score(parsed_scores, "English Language")
        record.mathematics = extract_subject_score(parsed_scores, "Mathematics")
        record.science = extract_subject_score(parsed_scores, "Biology")
        record.social_studies = extract_subject_score(parsed_scores, "Social and Development Studies")
        record.total_score = float(sum(scores))
        record.average = round(record.total_score / len(scores), 2) if scores else 0
        record.result_label = score_to_label(record.average)
        record.overall_result, record.english_failed = overall_result_for_record(record)
        record.passed = record.overall_result != "Failed"

    records.sort(
        key=lambda item: (
            0 if item.passed else 1,
            0 if not item.english_failed else 1,
            -item.average,
            -item.english,
            -item.mathematics,
            -item.science,
            item.student_name.casefold(),
        )
    )

    for index, record in enumerate(records, start=1):
        record.rank = index

    db.commit()
    for record in records:
        db.refresh(record)
    return records


def get_exam_records(db: Session) -> list[models.ExamRecord]:
    records = db.query(models.ExamRecord).order_by(models.ExamRecord.class_name.asc(), models.ExamRecord.rank.asc()).all()
    return [serialize_exam_record(record) for record in records]


def create_exam_record(db: Session, payload: schemas.ExamRecordCreate) -> models.ExamRecord:
    scores = build_subject_scores(payload)
    record = models.ExamRecord(
        student_id=payload.student_id,
        student_name=normalize_person_name(payload.student_name),
        class_name=normalize_form(payload.class_name),
        exam_name=normalize_spaces(payload.exam_name) or "Main Exam",
        term=normalize_term(payload.term),
        subject_scores=json.dumps(scores),
        english=extract_subject_score(scores, "English Language"),
        mathematics=extract_subject_score(scores, "Mathematics"),
        science=extract_subject_score(scores, "Biology"),
        social_studies=extract_subject_score(scores, "Social and Development Studies"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    recalculate_exam_rankings(db, record.class_name, record.exam_name)
    db.refresh(record)
    return serialize_exam_record(record)


def update_exam_record(db: Session, record_id: int, payload: schemas.ExamRecordUpdate) -> models.ExamRecord | None:
    record = db.query(models.ExamRecord).filter(models.ExamRecord.id == record_id).first()
    if not record:
        return None
    original_class = record.class_name
    original_exam = record.exam_name
    scores = build_subject_scores(payload)
    record.student_id = payload.student_id
    record.student_name = normalize_person_name(payload.student_name)
    record.class_name = normalize_form(payload.class_name)
    record.exam_name = normalize_spaces(payload.exam_name) or "Main Exam"
    record.term = normalize_term(payload.term)
    record.subject_scores = json.dumps(scores)
    record.english = extract_subject_score(scores, "English Language")
    record.mathematics = extract_subject_score(scores, "Mathematics")
    record.science = extract_subject_score(scores, "Biology")
    record.social_studies = extract_subject_score(scores, "Social and Development Studies")
    db.commit()
    recalculate_exam_rankings(db, original_class, original_exam)
    if original_class != record.class_name or original_exam != record.exam_name:
        recalculate_exam_rankings(db, record.class_name, record.exam_name)
    db.refresh(record)
    return serialize_exam_record(record)


def delete_exam_record(db: Session, record_id: int) -> bool:
    record = db.query(models.ExamRecord).filter(models.ExamRecord.id == record_id).first()
    if not record:
        return False
    class_name = record.class_name
    exam_name = record.exam_name
    db.delete(record)
    db.commit()
    recalculate_exam_rankings(db, class_name, exam_name)
    return True


def get_timetables(db: Session) -> list[dict]:
    timetables = db.query(models.Timetable).order_by(func.lower(models.Timetable.title).asc()).all()
    return [serialize_timetable(item) for item in timetables]


def create_timetable(db: Session, payload: schemas.TimetableCreate) -> dict:
    timetable = models.Timetable(
        title=normalize_spaces(payload.title),
        timetable_type=payload.timetable_type,
        class_name=normalize_form(payload.class_name),
        is_posted=payload.is_posted,
        note=normalize_spaces(payload.note),
        days=json.dumps(payload.days or DAYS_MONDAY_TO_FRIDAY),
    )
    db.add(timetable)
    db.flush()

    for entry in payload.entries:
        db.add(
            models.TimetableEntry(
                timetable_id=timetable.id,
                day_of_week=entry.day_of_week,
                start_time=entry.start_time,
                end_time=entry.end_time,
                subject=normalize_subject(entry.subject) or "",
                teacher_name=normalize_person_name(entry.teacher_name),
                room=normalize_spaces(entry.room),
                note=normalize_spaces(entry.note),
            )
        )

    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def update_timetable(db: Session, timetable_id: int, payload: schemas.TimetableUpdate) -> dict | None:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return None

    timetable.title = normalize_spaces(payload.title)
    timetable.timetable_type = payload.timetable_type
    timetable.class_name = normalize_form(payload.class_name)
    timetable.is_posted = payload.is_posted
    timetable.note = normalize_spaces(payload.note)
    timetable.days = json.dumps(payload.days or DAYS_MONDAY_TO_FRIDAY)

    db.query(models.TimetableEntry).filter(models.TimetableEntry.timetable_id == timetable.id).delete()
    for entry in payload.entries:
        db.add(
            models.TimetableEntry(
                timetable_id=timetable.id,
                day_of_week=entry.day_of_week,
                start_time=entry.start_time,
                end_time=entry.end_time,
                subject=normalize_subject(entry.subject) or "",
                teacher_name=normalize_person_name(entry.teacher_name),
                room=normalize_spaces(entry.room),
                note=normalize_spaces(entry.note),
            )
        )

    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def delete_timetable(db: Session, timetable_id: int) -> bool:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return False
    db.delete(timetable)
    db.commit()
    return True


def post_timetable(db: Session, timetable_id: int) -> dict | None:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return None
    timetable.is_posted = True
    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def get_dashboard_summary(db: Session) -> schemas.DashboardSummary:
    total_students = db.query(models.Student).count()
    total_teachers = db.query(models.Teacher).filter(models.Teacher.approved.is_(True)).count()
    attendance_records = db.query(models.Attendance).all()
    fees = db.query(models.Fee).all()
    top_students = (
        db.query(models.ExamRecord)
        .order_by(models.ExamRecord.rank.asc().nullslast(), models.ExamRecord.average.desc())
        .limit(5)
        .all()
    )

    present_count = len([item for item in attendance_records if item.status == "Present"])
    attendance_rate = round((present_count / len(attendance_records)) * 100, 2) if attendance_records else 0
    fees_collected = round(sum(item.amount_paid for item in fees), 2)

    return schemas.DashboardSummary(
        total_students=total_students,
        total_teachers=total_teachers,
        attendance_rate=attendance_rate,
        fees_collected=fees_collected,
        pending_teacher_accounts=len(list_pending_teachers(db)),
        posted_timetables=db.query(models.Timetable).filter(models.Timetable.is_posted.is_(True)).count(),
        exam_records=db.query(models.ExamRecord).count(),
        top_students=[schemas.ExamRecordOut.model_validate(serialize_exam_record(item)) for item in top_students],
    )
