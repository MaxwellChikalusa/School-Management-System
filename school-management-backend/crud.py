import datetime
import json
import os
import sqlite3

import bcrypt
from sqlalchemy import func, inspect, or_, text
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
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def legacy_hash_password(password: str) -> str:
    import hashlib

    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, stored_hash: str) -> tuple[bool, bool]:
    if not stored_hash:
        return False, False

    try:
        if stored_hash.startswith("$2"):
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")), False
    except ValueError:
        return False, False

    return legacy_hash_password(password) == stored_hash, True


def ensure_schema(db: Session) -> None:
    inspector = inspect(db.bind)
    exam_columns = {column["name"] for column in inspector.get_columns("exam_records")}
    if "subject_scores" not in exam_columns:
        db.execute(text("ALTER TABLE exam_records ADD COLUMN subject_scores TEXT"))
        db.commit()
    if "post_office_address" not in exam_columns:
        db.execute(text("ALTER TABLE exam_records ADD COLUMN post_office_address TEXT"))
        db.commit()
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "must_change_password" not in user_columns:
        db.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE"))
        db.commit()
    student_columns = {column["name"] for column in inspector.get_columns("students")}
    if "email_address" not in student_columns:
        db.execute(text("ALTER TABLE students ADD COLUMN email_address TEXT"))
        db.commit()
    fee_columns = {column["name"] for column in inspector.get_columns("fees")}
    if "admission_number" not in fee_columns:
        db.execute(text("ALTER TABLE fees ADD COLUMN admission_number TEXT"))
        db.commit()
    if "reference_numbers" not in fee_columns:
        db.execute(text("ALTER TABLE fees ADD COLUMN reference_numbers TEXT"))
        db.commit()
    if "receipt_files" not in fee_columns:
        db.execute(text("ALTER TABLE fees ADD COLUMN receipt_files TEXT"))
        db.commit()
    if "transaction_date" not in fee_columns:
        db.execute(text("ALTER TABLE fees ADD COLUMN transaction_date TEXT"))
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
    data["email_address"] = normalize_spaces(data.get("email_address"))
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
    data["assigned_forms"] = [
        normalized
        for form_name in data.get("assigned_forms", [])
        if (normalized := normalize_form(form_name))
    ]
    return data


def json_list_or_empty(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed if item]


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
        "admission_number": record.student.admission_number if record.student else None,
        "student_name": record.student_name,
        "class_name": record.class_name,
        "post_office_address": record.post_office_address,
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
        must_change_password=True,
        full_name="System Administrator",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def migrate_legacy_sqlite_if_needed(db: Session) -> bool:
    if db.bind.dialect.name != "postgresql":
        return False

    has_live_data = any(
        [
            db.query(models.User).count() > 1,
            db.query(models.Teacher).count() > 0,
            db.query(models.Student).count() > 0,
            db.query(models.Attendance).count() > 0,
            db.query(models.Fee).count() > 0,
            db.query(models.ExamRecord).count() > 0,
            db.query(models.Timetable).count() > 0,
            db.query(models.TimetableEntry).count() > 0,
        ]
    )
    if has_live_data:
        return False

    legacy_path = os.getenv(
        "LEGACY_SQLITE_PATH",
        os.path.join(os.path.dirname(__file__), "school_management.db"),
    )
    if not os.path.exists(legacy_path):
        return False

    connection = sqlite3.connect(legacy_path)
    connection.row_factory = sqlite3.Row

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            return False

        db.query(models.TimetableEntry).delete()
        db.query(models.Timetable).delete()
        db.query(models.ExamRecord).delete()
        db.query(models.Fee).delete()
        db.query(models.Attendance).delete()
        db.query(models.Student).delete()
        db.query(models.Teacher).delete()
        db.query(models.User).delete()
        db.flush()

        for row in connection.execute("SELECT * FROM users"):
            db.add(
                models.User(
                    id=row["id"],
                    username=row["username"],
                    password_hash=row["password_hash"],
                    role=row["role"],
                    status=row["status"],
                    must_change_password=True,
                    full_name=row["full_name"],
                    profile_image=row["profile_image"],
                )
            )

        for row in connection.execute("SELECT * FROM teachers"):
            db.add(
                models.Teacher(
                    id=row["id"],
                    full_name=row["full_name"],
                    sex=row["sex"],
                    subject=row["subject"],
                    phone=row["phone"],
                    email=row["email"],
                    qualification=row["qualification"],
                    profile_image=row["profile_image"],
                    user_id=row["user_id"],
                    approved=bool(row["approved"]),
                )
            )

        for row in connection.execute("SELECT * FROM students"):
            db.add(
                models.Student(
                    id=row["id"],
                    full_name=row["full_name"],
                    sex=row["sex"],
                    age=row["age"],
                    admission_number=row["admission_number"],
                    class_name=row["class_name"],
                    guardian_name=row["guardian_name"],
                    guardian_contact=row["guardian_contact"],
                    email_address=None,
                    address=row["address"],
                )
            )

        for row in connection.execute("SELECT * FROM attendance"):
            db.add(
                models.Attendance(
                    id=row["id"],
                    student_id=row["student_id"],
                    date=row["date"],
                    status=row["status"],
                    note=row["note"],
                )
            )

        for row in connection.execute("SELECT * FROM fees"):
            db.add(
                models.Fee(
                    id=row["id"],
                    student_id=row["student_id"],
                    admission_number=None,
                    student_name=row["student_name"],
                    transaction_date=None,
                    expected_amount=float(row["expected_amount"] or 0),
                    amount_paid=float(row["amount_paid"] or 0),
                    fully_paid=bool(row["fully_paid"]),
                    reference_numbers=None,
                    receipt_files=None,
                    note=row["note"],
                )
            )

        for row in connection.execute("SELECT * FROM exam_records"):
            db.add(
                models.ExamRecord(
                    id=row["id"],
                    student_id=row["student_id"],
                    student_name=row["student_name"],
                    class_name=row["class_name"],
                    post_office_address=None,
                    exam_name=row["exam_name"],
                    term=row["term"],
                    subject_scores=row["subject_scores"],
                    english=float(row["english"] or 0),
                    mathematics=float(row["mathematics"] or 0),
                    science=float(row["science"] or 0),
                    social_studies=float(row["social_studies"] or 0),
                    average=float(row["average"] or 0),
                    total_score=float(row["total_score"] or 0),
                    result_label=row["result_label"],
                    overall_result=row["overall_result"],
                    english_failed=bool(row["english_failed"]),
                    passed=bool(row["passed"]),
                    rank=row["rank"],
                )
            )

        for row in connection.execute("SELECT * FROM timetables"):
            db.add(
                models.Timetable(
                    id=row["id"],
                    title=row["title"],
                    timetable_type=row["timetable_type"],
                    class_name=row["class_name"],
                    is_posted=bool(row["is_posted"]),
                    note=row["note"],
                    days=row["days"],
                )
            )

        for row in connection.execute("SELECT * FROM timetable_entries"):
            db.add(
                models.TimetableEntry(
                    id=row["id"],
                    timetable_id=row["timetable_id"],
                    day_of_week=row["day_of_week"],
                    start_time=row["start_time"],
                    end_time=row["end_time"],
                    subject=row["subject"],
                    teacher_name=row["teacher_name"],
                    room=row["room"],
                    note=row["note"],
                )
            )

        db.flush()

        for teacher in db.query(models.Teacher).filter(models.Teacher.approved.is_(True)).all():
            sync_primary_subject_access(db, teacher, FORM_OPTIONS)

        for table_name in [
            "users",
            "teachers",
            "students",
            "attendance",
            "fees",
            "exam_records",
            "timetables",
            "timetable_entries",
            "teacher_subject_accesses",
            "teacher_access_requests",
        ]:
            db.execute(
                text(
                    "SELECT setval("
                    "pg_get_serial_sequence(:table_name, 'id'), "
                    "COALESCE((SELECT MAX(id) FROM " + table_name + "), 1), true)"
                ),
                {"table_name": table_name},
            )

        db.commit()
        return True
    finally:
        connection.close()


def get_teacher_by_user_id(db: Session, user_id: int | None) -> models.Teacher | None:
    if not user_id:
        return None
    return db.query(models.Teacher).filter(models.Teacher.user_id == user_id).first()


def ensure_access_record(db: Session, teacher_id: int, subject: str, form_name: str) -> None:
    existing = (
        db.query(models.TeacherSubjectAccess)
        .filter(
            models.TeacherSubjectAccess.teacher_id == teacher_id,
            models.TeacherSubjectAccess.subject == subject,
            models.TeacherSubjectAccess.form_name == form_name,
        )
        .first()
    )
    if existing:
        return
    db.add(models.TeacherSubjectAccess(teacher_id=teacher_id, subject=subject, form_name=form_name))


def sync_primary_subject_access(db: Session, teacher: models.Teacher, forms: list[str]) -> None:
    primary_subject = normalize_subject(teacher.subject) or "General"
    normalized_forms = sorted(
        {normalize_form(form_name) for form_name in forms if normalize_form(form_name)},
        key=lambda item: FORM_OPTIONS.index(item) if item in FORM_OPTIONS else 99,
    )
    existing = (
        db.query(models.TeacherSubjectAccess)
        .filter(
            models.TeacherSubjectAccess.teacher_id == teacher.id,
            models.TeacherSubjectAccess.subject == primary_subject,
        )
        .all()
    )
    existing_forms = {item.form_name for item in existing}

    for access in existing:
        if access.form_name not in normalized_forms:
            db.delete(access)

    for form_name in normalized_forms:
        if form_name not in existing_forms:
            ensure_access_record(db, teacher.id, primary_subject, form_name)


def get_teacher_accesses(db: Session, teacher_id: int) -> list[models.TeacherSubjectAccess]:
    return (
        db.query(models.TeacherSubjectAccess)
        .filter(models.TeacherSubjectAccess.teacher_id == teacher_id)
        .order_by(models.TeacherSubjectAccess.subject.asc(), models.TeacherSubjectAccess.form_name.asc())
        .all()
    )


def serialize_teacher(db: Session, teacher: models.Teacher) -> dict:
    accesses = get_teacher_accesses(db, teacher.id)
    primary_subject = normalize_subject(teacher.subject) or "General"
    user = db.query(models.User).filter(models.User.id == teacher.user_id).first() if teacher.user_id else None
    assigned_forms = sorted(
        {
            access.form_name
            for access in accesses
            if access.subject.casefold() == primary_subject.casefold()
        },
        key=lambda item: FORM_OPTIONS.index(item) if item in FORM_OPTIONS else 99,
    )
    approved_subjects = sorted({access.subject for access in accesses}, key=str.casefold)
    return {
        "id": teacher.id,
        "full_name": teacher.full_name,
        "sex": teacher.sex,
        "subject": primary_subject,
        "phone": teacher.phone,
        "email": teacher.email,
        "qualification": teacher.qualification,
        "profile_image": teacher.profile_image,
        "approved": teacher.approved,
        "user_id": teacher.user_id,
        "assigned_forms": assigned_forms,
        "approved_subjects": approved_subjects,
        "account_status": user.status if user else ("approved" if teacher.approved else "pending"),
    }


def get_allowed_forms_for_user(db: Session, user: models.User) -> list[str]:
    if user.role == "admin":
        return FORM_OPTIONS
    teacher = get_teacher_by_user_id(db, user.id)
    if not teacher:
        return []
    accesses = get_teacher_accesses(db, teacher.id)
    if teacher.approved and not accesses:
        sync_primary_subject_access(db, teacher, FORM_OPTIONS)
        db.commit()
        accesses = get_teacher_accesses(db, teacher.id)
    forms = {access.form_name for access in accesses}
    return sorted(forms, key=lambda item: FORM_OPTIONS.index(item) if item in FORM_OPTIONS else 99)


def get_allowed_subjects_for_user(db: Session, user: models.User) -> list[str]:
    if user.role == "admin":
        return SECONDARY_SUBJECTS
    teacher = get_teacher_by_user_id(db, user.id)
    if not teacher:
        return []
    accesses = get_teacher_accesses(db, teacher.id)
    if teacher.approved and not accesses:
        sync_primary_subject_access(db, teacher, FORM_OPTIONS)
        db.commit()
        accesses = get_teacher_accesses(db, teacher.id)
    return sorted({access.subject for access in accesses}, key=str.casefold)


def get_permission_context(db: Session, user: models.User) -> schemas.PermissionContext:
    return schemas.PermissionContext(
        user_id=user.id,
        role=user.role,
        allowed_forms=get_allowed_forms_for_user(db, user),
        allowed_subjects=get_allowed_subjects_for_user(db, user),
    )


def ensure_form_access(db: Session, user: models.User, form_name: str) -> str:
    normalized_form = normalize_form(form_name)
    if user.role == "admin":
        return normalized_form
    if normalized_form not in get_allowed_forms_for_user(db, user):
        raise PermissionError("You can only work with students in your approved forms")
    return normalized_form


def ensure_subject_access(db: Session, user: models.User, subject: str) -> str:
    normalized_subject = normalize_subject(subject) or ""
    if user.role == "admin":
        return normalized_subject
    if normalized_subject not in get_allowed_subjects_for_user(db, user):
        raise PermissionError("You can only work with your approved subjects")
    return normalized_subject


def get_student_for_user(db: Session, user: models.User, student_id: int) -> models.Student | None:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        return None
    if user.role == "admin":
        return student
    return student if student.class_name in get_allowed_forms_for_user(db, user) else None


def serialize_access_request(request_item: models.TeacherAccessRequest) -> dict:
    return {
        "id": request_item.id,
        "teacher_id": request_item.teacher_id,
        "teacher_name": request_item.teacher.full_name if request_item.teacher else "Teacher",
        "requested_subject": request_item.requested_subject,
        "requested_forms": json.loads(request_item.requested_forms),
        "note": request_item.note,
        "status": request_item.status,
        "admin_note": request_item.admin_note,
    }


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
        must_change_password=True,
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
    if not user:
        return None
    is_valid, should_upgrade = verify_password(password, user.password_hash)
    if not is_valid:
        return None
    if should_upgrade:
        user.password_hash = hash_password(password)
        db.commit()
        db.refresh(user)
    return user


def change_password(db: Session, user: models.User, current_password: str, new_password: str) -> models.User | None:
    is_valid, _ = verify_password(current_password, user.password_hash)
    if not is_valid:
        return None
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
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


def approve_teacher(db: Session, user_id: int, forms: list[str] | None = None) -> models.User | None:
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "teacher").first()
    if not user:
        return None
    user.status = "approved"
    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == user.id).first()
    if teacher:
        teacher.approved = True
        sync_primary_subject_access(db, teacher, forms or FORM_OPTIONS)
    db.commit()
    db.refresh(user)
    return user


def create_admin(db: Session, payload: schemas.UserSignup) -> models.User:
    return signup_user(db, payload.model_copy(update={"role": "admin"}))


def set_teacher_account_status(db: Session, user_id: int, status: str) -> models.User | None:
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "teacher").first()
    if not user:
        return None
    user.status = status
    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == user.id).first()
    if teacher:
        teacher.approved = status == "approved"
    db.commit()
    db.refresh(user)
    return user


def get_students(db: Session, current_user: models.User) -> list[models.Student]:
    query = db.query(models.Student)
    if current_user.role == "teacher":
        query = query.filter(models.Student.class_name.in_(get_allowed_forms_for_user(db, current_user) or [""]))
    return query.order_by(models.Student.class_name.asc(), func.lower(models.Student.full_name).asc()).all()


def generate_admission_number(db: Session) -> str:
    current_year = datetime.datetime.now().year
    prefix = f"COM-{current_year}-"
    max_admission = db.query(func.max(models.Student.admission_number)).filter(
        models.Student.admission_number.like(f"{prefix}%")
    ).scalar()
    if max_admission:
        try:
            last_sequence = int(max_admission.rsplit("-", 1)[1])
        except (ValueError, IndexError):
            last_sequence = 0
        next_sequence = last_sequence + 1
    else:
        next_sequence = 1
    return f"{prefix}{next_sequence:03d}"


def find_duplicate_student(
    db: Session, student_data: dict, exclude_student_id: int | None = None
) -> models.Student | None:
    query = db.query(models.Student).filter(
        func.lower(models.Student.full_name) == (student_data.get("full_name") or "").casefold(),
        models.Student.class_name == student_data.get("class_name"),
        models.Student.sex == student_data.get("sex"),
    )
    if exclude_student_id is not None:
        query = query.filter(models.Student.id != exclude_student_id)

    matches = query.order_by(models.Student.id.asc()).all()
    for student in matches:
        same_guardian = not student_data.get("guardian_name") or student.guardian_name == student_data.get("guardian_name")
        same_contact = not student_data.get("guardian_contact") or student.guardian_contact == student_data.get("guardian_contact")
        same_email = not student_data.get("email_address") or student.email_address == student_data.get("email_address")
        if same_guardian and same_contact and same_email:
            return student
    return None


def find_duplicate_exam_record(
    db: Session, payload: schemas.ExamRecordBase, exclude_record_id: int | None = None
) -> models.ExamRecord | None:
    normalized_class = normalize_form(payload.class_name)
    normalized_exam_name = normalize_spaces(payload.exam_name) or "Main Exam"
    normalized_term = normalize_term(payload.term)
    normalized_student_name = normalize_person_name(payload.student_name)

    query = db.query(models.ExamRecord).filter(
        models.ExamRecord.class_name == normalized_class,
        models.ExamRecord.exam_name == normalized_exam_name,
    )
    if normalized_term is None:
        query = query.filter(models.ExamRecord.term.is_(None))
    else:
        query = query.filter(models.ExamRecord.term == normalized_term)
    if exclude_record_id is not None:
        query = query.filter(models.ExamRecord.id != exclude_record_id)

    if payload.student_id:
        query = query.filter(models.ExamRecord.student_id == payload.student_id)
    else:
        query = query.filter(func.lower(models.ExamRecord.student_name) == (normalized_student_name or "").casefold())

    return query.first()


def create_student(db: Session, payload: schemas.StudentCreate, current_user: models.User) -> models.Student:
    data = normalize_student_payload(payload)
    data["class_name"] = ensure_form_access(db, current_user, data["class_name"])
    duplicate = find_duplicate_student(db, data)
    if duplicate:
        raise ValueError("Details Already Entered")
    data["admission_number"] = generate_admission_number(db)

    student = models.Student(**data)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(db: Session, student_id: int, payload: schemas.StudentUpdate, current_user: models.User) -> models.Student | None:
    student = get_student_for_user(db, current_user, student_id)
    if not student:
        return None
    data = normalize_student_payload(payload)
    data["class_name"] = ensure_form_access(db, current_user, data["class_name"])
    duplicate = find_duplicate_student(db, data, exclude_student_id=student.id)
    if duplicate:
        raise ValueError("Details Already Entered")
    data["admission_number"] = student.admission_number
    for field, value in data.items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int, current_user: models.User) -> bool:
    student = get_student_for_user(db, current_user, student_id)
    if not student:
        return False
    db.query(models.Attendance).filter(models.Attendance.student_id == student.id).delete()
    db.query(models.Fee).filter(models.Fee.student_id == student.id).update({"student_id": None})
    db.query(models.ExamRecord).filter(models.ExamRecord.student_id == student.id).update({"student_id": None})
    db.delete(student)
    db.commit()
    return True


def get_teachers(db: Session) -> list[dict]:
    teachers = db.query(models.Teacher).order_by(func.lower(models.Teacher.full_name).asc()).all()
    return [serialize_teacher(db, teacher) for teacher in teachers]


def create_teacher(db: Session, payload: schemas.TeacherCreate) -> models.Teacher:
    data = normalize_teacher_payload(payload)
    assigned_forms = data.pop("assigned_forms", [])
    teacher = models.Teacher(**data)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    sync_primary_subject_access(db, teacher, assigned_forms or FORM_OPTIONS)
    db.commit()
    db.refresh(teacher)
    return serialize_teacher(db, teacher)


def update_teacher(db: Session, teacher_id: int, payload: schemas.TeacherUpdate) -> models.Teacher | None:
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        return None
    data = normalize_teacher_payload(payload)
    assigned_forms = data.pop("assigned_forms", [])
    for field, value in data.items():
        setattr(teacher, field, value)
    sync_primary_subject_access(db, teacher, assigned_forms or FORM_OPTIONS)
    if teacher.user_id:
        user = db.query(models.User).filter(models.User.id == teacher.user_id).first()
        if user:
            user.full_name = teacher.full_name
            user.profile_image = teacher.profile_image
    db.commit()
    db.refresh(teacher)
    return serialize_teacher(db, teacher)


def get_attendance(db: Session, current_user: models.User) -> list[models.Attendance]:
    query = db.query(models.Attendance).join(models.Student, models.Attendance.student_id == models.Student.id)
    if current_user.role == "teacher":
        query = query.filter(models.Student.class_name.in_(get_allowed_forms_for_user(db, current_user) or [""]))
    return query.order_by(models.Attendance.date.desc(), models.Attendance.id.desc()).all()


def find_duplicate_attendance(
    db: Session, student_id: int, date: str, exclude_attendance_id: int | None = None
) -> models.Attendance | None:
    query = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date == date,
    )
    if exclude_attendance_id is not None:
        query = query.filter(models.Attendance.id != exclude_attendance_id)
    return query.first()


def create_attendance(db: Session, payload: schemas.AttendanceCreate, current_user: models.User) -> models.Attendance:
    if not get_student_for_user(db, current_user, payload.student_id):
        raise PermissionError("You can only mark attendance for students in your approved forms")
    if find_duplicate_attendance(db, payload.student_id, payload.date):
        raise ValueError("Already entered")
    attendance = models.Attendance(**payload.model_dump())
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def update_attendance(db: Session, attendance_id: int, payload: schemas.AttendanceUpdate, current_user: models.User) -> models.Attendance | None:
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance or not get_student_for_user(db, current_user, attendance.student_id):
        return None
    if not get_student_for_user(db, current_user, payload.student_id):
        raise PermissionError("You can only update attendance for students in your approved forms")
    if find_duplicate_attendance(db, payload.student_id, payload.date, exclude_attendance_id=attendance.id):
        raise ValueError("Already entered")
    for field, value in payload.model_dump().items():
        setattr(attendance, field, value)
    db.commit()
    db.refresh(attendance)
    return attendance


def delete_attendance(db: Session, attendance_id: int, current_user: models.User) -> bool:
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance or not get_student_for_user(db, current_user, attendance.student_id):
        return False
    db.delete(attendance)
    db.commit()
    return True


def get_fees(db: Session, current_user: models.User) -> list[dict]:
    query = db.query(models.Fee).outerjoin(models.Student, models.Fee.student_id == models.Student.id)
    if current_user.role == "teacher":
        query = query.filter(models.Student.class_name.in_(get_allowed_forms_for_user(db, current_user) or [""]))
    fees = query.order_by(func.lower(models.Fee.student_name).asc()).all()
    return [serialize_fee(item) for item in fees]


def serialize_fee(fee: models.Fee) -> dict:
    reference_numbers = json_list_or_empty(fee.reference_numbers)
    receipt_files = json_list_or_empty(fee.receipt_files)
    return {
        "id": fee.id,
        "student_id": fee.student_id,
        "admission_number": fee.admission_number or (fee.student.admission_number if fee.student else None),
        "student_name": fee.student_name,
        "transaction_date": fee.transaction_date,
        "expected_amount": fee.expected_amount,
        "amount_paid": fee.amount_paid,
        "fully_paid": fee.fully_paid,
        "reference_number": ", ".join(reference_numbers),
        "receipt_files": receipt_files,
        "note": fee.note,
        "balance": max(fee.expected_amount - fee.amount_paid, 0),
    }


def get_fee_by_admission_number(
    db: Session, admission_number: str | None, current_user: models.User, exclude_fee_id: int | None = None
) -> models.Fee | None:
    normalized_admission_number = normalize_spaces(admission_number)
    if not normalized_admission_number:
        return None
    query = db.query(models.Fee).filter(
        or_(
            models.Fee.admission_number == normalized_admission_number,
            models.Fee.student.has(models.Student.admission_number == normalized_admission_number),
        )
    )
    if exclude_fee_id is not None:
        query = query.filter(models.Fee.id != exclude_fee_id)
    fee = query.first()
    if not fee:
        return None
    if fee.student_id and not get_student_for_user(db, current_user, fee.student_id):
        return None
    return fee


def merge_fee_details(fee: models.Fee, data: dict) -> None:
    existing_reference_numbers = json_list_or_empty(fee.reference_numbers)
    new_reference_number = normalize_spaces(data.get("reference_number"))
    if new_reference_number:
        existing_reference_numbers.append(new_reference_number)

    existing_receipts = json_list_or_empty(fee.receipt_files)
    incoming_receipts = [item for item in data.get("receipt_files", []) if item]
    combined_note = " | ".join(
        item for item in [normalize_spaces(fee.note), normalize_spaces(data.get("note"))] if item
    )
    combined_transaction_date = " | ".join(
        item for item in [normalize_spaces(fee.transaction_date), normalize_spaces(data.get("transaction_date"))] if item
    )

    if not float(fee.expected_amount or 0):
        fee.expected_amount = float(data.get("expected_amount") or 0)
    fee.amount_paid = float(fee.amount_paid or 0) + float(data.get("amount_paid") or 0)
    fee.fully_paid = fee.amount_paid >= fee.expected_amount if fee.expected_amount else bool(data.get("fully_paid"))
    fee.reference_numbers = json.dumps(existing_reference_numbers)
    fee.receipt_files = json.dumps([*existing_receipts, *incoming_receipts])
    fee.note = combined_note or None
    fee.transaction_date = combined_transaction_date or None
    if data.get("student_name"):
        fee.student_name = data["student_name"]
    if data.get("student_id"):
        fee.student_id = data["student_id"]
    if data.get("admission_number"):
        fee.admission_number = data["admission_number"]


def create_fee(db: Session, payload: schemas.FeeCreate, current_user: models.User) -> dict:
    data = payload.model_dump()
    student = get_student_for_user(db, current_user, data["student_id"]) if data["student_id"] else None
    if data["student_id"] and not student:
        raise PermissionError("You can only manage fees for students in your approved forms")
    data["student_name"] = normalize_person_name(data["student_name"])
    data["admission_number"] = (
        normalize_spaces(student.admission_number) if student else normalize_spaces(data.get("admission_number"))
    )
    data["transaction_date"] = normalize_spaces(data.get("transaction_date"))
    data["reference_number"] = normalize_spaces(data.get("reference_number"))
    data["receipt_files"] = [item for item in data.get("receipt_files", []) if item]
    data["note"] = normalize_spaces(data.get("note"))
    existing_fee = get_fee_by_admission_number(db, data.get("admission_number"), current_user)
    if existing_fee:
        if not payload.merge_with_existing:
            raise ValueError("Do you want to add this to existing fees?")
        merge_fee_details(existing_fee, data)
        db.commit()
        db.refresh(existing_fee)
        return serialize_fee(existing_fee)
    data["reference_numbers"] = json.dumps([data["reference_number"]]) if data.get("reference_number") else json.dumps([])
    data["receipt_files"] = json.dumps(data.get("receipt_files", []))
    data.pop("reference_number", None)
    data.pop("merge_with_existing", None)
    fee = models.Fee(**data)
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return serialize_fee(fee)


def update_fee(db: Session, fee_id: int, payload: schemas.FeeUpdate, current_user: models.User) -> dict | None:
    fee = db.query(models.Fee).filter(models.Fee.id == fee_id).first()
    if not fee:
        return None
    if fee.student_id and not get_student_for_user(db, current_user, fee.student_id):
        return None
    data = payload.model_dump()
    student = get_student_for_user(db, current_user, data["student_id"]) if data["student_id"] else None
    if data["student_id"] and not student:
        raise PermissionError("You can only manage fees for students in your approved forms")
    data["student_name"] = normalize_person_name(data["student_name"])
    data["admission_number"] = (
        normalize_spaces(student.admission_number) if student else normalize_spaces(data.get("admission_number"))
    )
    data["transaction_date"] = normalize_spaces(data.get("transaction_date"))
    duplicate_fee = get_fee_by_admission_number(db, data.get("admission_number"), current_user, exclude_fee_id=fee.id)
    if duplicate_fee:
        raise ValueError("Do you want to add this to existing fees?")
    data["reference_number"] = normalize_spaces(data.get("reference_number"))
    data["reference_numbers"] = json.dumps([data["reference_number"]]) if data.get("reference_number") else json.dumps([])
    data["receipt_files"] = json.dumps([item for item in data.get("receipt_files", []) if item])
    data["note"] = normalize_spaces(data.get("note"))
    data.pop("reference_number", None)
    for field, value in data.items():
        setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return serialize_fee(fee)


def delete_fee(db: Session, fee_id: int, current_user: models.User) -> bool:
    fee = db.query(models.Fee).filter(models.Fee.id == fee_id).first()
    if not fee or (fee.student_id and not get_student_for_user(db, current_user, fee.student_id)):
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


def get_exam_records(db: Session, current_user: models.User) -> list[models.ExamRecord]:
    query = db.query(models.ExamRecord)
    if current_user.role == "teacher":
        query = query.filter(models.ExamRecord.class_name.in_(get_allowed_forms_for_user(db, current_user) or [""]))
    records = query.order_by(models.ExamRecord.class_name.asc(), models.ExamRecord.rank.asc()).all()
    return [serialize_exam_record(record) for record in records]


def create_exam_record(db: Session, payload: schemas.ExamRecordCreate, current_user: models.User) -> models.ExamRecord:
    scores = build_subject_scores(payload)
    normalized_class = ensure_form_access(db, current_user, payload.class_name)
    duplicate = find_duplicate_exam_record(db, payload)
    if duplicate:
        raise ValueError("Details Already Entered")
    for item in scores:
        ensure_subject_access(db, current_user, item["subject"])
    if payload.student_id and not get_student_for_user(db, current_user, payload.student_id):
        raise PermissionError("You can only manage results for students in your approved forms")
    record = models.ExamRecord(
        student_id=payload.student_id,
        student_name=normalize_person_name(payload.student_name),
        class_name=normalized_class,
        post_office_address=normalize_spaces(payload.post_office_address),
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


def update_exam_record(db: Session, record_id: int, payload: schemas.ExamRecordUpdate, current_user: models.User) -> models.ExamRecord | None:
    record = db.query(models.ExamRecord).filter(models.ExamRecord.id == record_id).first()
    if not record:
        return None
    if current_user.role == "teacher" and record.class_name not in get_allowed_forms_for_user(db, current_user):
        return None
    original_class = record.class_name
    original_exam = record.exam_name
    scores = build_subject_scores(payload)
    normalized_class = ensure_form_access(db, current_user, payload.class_name)
    duplicate = find_duplicate_exam_record(db, payload, exclude_record_id=record.id)
    if duplicate:
        raise ValueError("Details Already Entered")
    for item in scores:
        ensure_subject_access(db, current_user, item["subject"])
    if payload.student_id and not get_student_for_user(db, current_user, payload.student_id):
        raise PermissionError("You can only manage results for students in your approved forms")
    record.student_id = payload.student_id
    record.student_name = normalize_person_name(payload.student_name)
    record.class_name = normalized_class
    record.post_office_address = normalize_spaces(payload.post_office_address)
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


def delete_exam_record(db: Session, record_id: int, current_user: models.User) -> bool:
    record = db.query(models.ExamRecord).filter(models.ExamRecord.id == record_id).first()
    if not record:
        return False
    if current_user.role == "teacher" and record.class_name not in get_allowed_forms_for_user(db, current_user):
        return False
    class_name = record.class_name
    exam_name = record.exam_name
    db.delete(record)
    db.commit()
    recalculate_exam_rankings(db, class_name, exam_name)
    return True


def get_timetables(db: Session, current_user: models.User) -> list[dict]:
    query = db.query(models.Timetable)
    if current_user.role == "teacher":
        query = query.filter(models.Timetable.class_name.in_(get_allowed_forms_for_user(db, current_user) or [""]))
    timetables = query.order_by(func.lower(models.Timetable.title).asc()).all()
    return [serialize_timetable(item) for item in timetables]


def create_timetable(db: Session, payload: schemas.TimetableCreate, current_user: models.User) -> dict:
    normalized_class = ensure_form_access(db, current_user, payload.class_name)
    timetable = models.Timetable(
        title=normalize_spaces(payload.title),
        timetable_type=payload.timetable_type,
        class_name=normalized_class,
        is_posted=payload.is_posted,
        note=normalize_spaces(payload.note),
        days=json.dumps(payload.days or DAYS_MONDAY_TO_FRIDAY),
    )
    db.add(timetable)
    db.flush()

    for entry in payload.entries:
        normalized_subject = ensure_subject_access(db, current_user, entry.subject)
        db.add(
            models.TimetableEntry(
                timetable_id=timetable.id,
                day_of_week=entry.day_of_week,
                start_time=entry.start_time,
                end_time=entry.end_time,
                subject=normalized_subject,
                teacher_name=normalize_person_name(entry.teacher_name),
                room=normalize_spaces(entry.room),
                note=normalize_spaces(entry.note),
            )
        )

    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def update_timetable(db: Session, timetable_id: int, payload: schemas.TimetableUpdate, current_user: models.User) -> dict | None:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return None
    if current_user.role == "teacher" and timetable.class_name not in get_allowed_forms_for_user(db, current_user):
        return None

    timetable.title = normalize_spaces(payload.title)
    timetable.timetable_type = payload.timetable_type
    timetable.class_name = ensure_form_access(db, current_user, payload.class_name)
    timetable.is_posted = payload.is_posted
    timetable.note = normalize_spaces(payload.note)
    timetable.days = json.dumps(payload.days or DAYS_MONDAY_TO_FRIDAY)

    db.query(models.TimetableEntry).filter(models.TimetableEntry.timetable_id == timetable.id).delete()
    for entry in payload.entries:
        normalized_subject = ensure_subject_access(db, current_user, entry.subject)
        db.add(
            models.TimetableEntry(
                timetable_id=timetable.id,
                day_of_week=entry.day_of_week,
                start_time=entry.start_time,
                end_time=entry.end_time,
                subject=normalized_subject,
                teacher_name=normalize_person_name(entry.teacher_name),
                room=normalize_spaces(entry.room),
                note=normalize_spaces(entry.note),
            )
        )

    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def delete_timetable(db: Session, timetable_id: int, current_user: models.User) -> bool:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return False
    if current_user.role == "teacher" and timetable.class_name not in get_allowed_forms_for_user(db, current_user):
        return False
    db.delete(timetable)
    db.commit()
    return True


def post_timetable(db: Session, timetable_id: int, current_user: models.User) -> dict | None:
    timetable = db.query(models.Timetable).filter(models.Timetable.id == timetable_id).first()
    if not timetable:
        return None
    if current_user.role == "teacher" and timetable.class_name not in get_allowed_forms_for_user(db, current_user):
        return None
    timetable.is_posted = True
    db.commit()
    db.refresh(timetable)
    return serialize_timetable(timetable)


def get_dashboard_summary(db: Session, current_user: models.User) -> schemas.DashboardSummary:
    allowed_forms = get_allowed_forms_for_user(db, current_user)
    student_query = db.query(models.Student)
    attendance_query = db.query(models.Attendance).join(models.Student, models.Attendance.student_id == models.Student.id)
    fee_query = db.query(models.Fee).outerjoin(models.Student, models.Fee.student_id == models.Student.id)
    exam_query = db.query(models.ExamRecord)
    timetable_query = db.query(models.Timetable)

    if current_user.role == "teacher":
        student_query = student_query.filter(models.Student.class_name.in_(allowed_forms or [""]))
        attendance_query = attendance_query.filter(models.Student.class_name.in_(allowed_forms or [""]))
        fee_query = fee_query.filter(models.Student.class_name.in_(allowed_forms or [""]))
        exam_query = exam_query.filter(models.ExamRecord.class_name.in_(allowed_forms or [""]))
        timetable_query = timetable_query.filter(models.Timetable.class_name.in_(allowed_forms or [""]))

    total_students = student_query.count()
    total_teachers = db.query(models.Teacher).filter(models.Teacher.approved.is_(True)).count()
    attendance_records = attendance_query.all()
    fees = fee_query.all()
    top_students = exam_query.order_by(models.ExamRecord.rank.asc().nullslast(), models.ExamRecord.average.desc()).limit(5).all()

    present_count = len([item for item in attendance_records if item.status == "Present"])
    attendance_rate = round((present_count / len(attendance_records)) * 100, 2) if attendance_records else 0
    fees_collected = round(sum(item.amount_paid for item in fees), 2)

    return schemas.DashboardSummary(
        total_students=total_students,
        total_teachers=total_teachers,
        attendance_rate=attendance_rate,
        fees_collected=fees_collected,
        pending_teacher_accounts=len(list_pending_teachers(db)) if current_user.role == "admin" else 0,
        posted_timetables=timetable_query.filter(models.Timetable.is_posted.is_(True)).count(),
        exam_records=exam_query.count(),
        top_students=[schemas.ExamRecordOut.model_validate(serialize_exam_record(item)) for item in top_students],
    )


def list_access_requests(db: Session, current_user: models.User) -> list[dict]:
    query = db.query(models.TeacherAccessRequest).join(models.Teacher)
    if current_user.role == "teacher":
        teacher = get_teacher_by_user_id(db, current_user.id)
        if not teacher:
            return []
        query = query.filter(models.TeacherAccessRequest.teacher_id == teacher.id)
    items = query.order_by(models.TeacherAccessRequest.id.desc()).all()
    return [serialize_access_request(item) for item in items]


def create_access_request(db: Session, current_user: models.User, payload: schemas.TeacherAccessRequestCreate) -> dict:
    teacher = get_teacher_by_user_id(db, current_user.id)
    if not teacher:
        raise PermissionError("Only teachers can request additional subject access")
    requested_subject = normalize_subject(payload.requested_subject) or ""
    requested_forms = sorted(
        {normalize_form(form_name) for form_name in payload.requested_forms if normalize_form(form_name)},
        key=lambda item: FORM_OPTIONS.index(item) if item in FORM_OPTIONS else 99,
    )
    request_item = models.TeacherAccessRequest(
        teacher_id=teacher.id,
        requested_subject=requested_subject,
        requested_forms=json.dumps(requested_forms),
        note=normalize_spaces(payload.note),
        status="pending",
    )
    db.add(request_item)
    db.commit()
    db.refresh(request_item)
    return serialize_access_request(request_item)


def approve_access_request(
    db: Session, request_id: int, payload: schemas.TeacherAccessRequestApprove
) -> dict | None:
    request_item = db.query(models.TeacherAccessRequest).filter(models.TeacherAccessRequest.id == request_id).first()
    if not request_item:
        return None
    request_item.status = "approved"
    request_item.admin_note = normalize_spaces(payload.admin_note)
    for form_name in json.loads(request_item.requested_forms):
        ensure_access_record(db, request_item.teacher_id, request_item.requested_subject, form_name)
    db.commit()
    db.refresh(request_item)
    return serialize_access_request(request_item)
