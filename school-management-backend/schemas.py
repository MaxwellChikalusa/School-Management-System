import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

PHONE_PATTERN = re.compile(r"^(?:099\d{7}|098\d{7}|088\d{7}|\+26599\d{7}|\+26598\d{7}|\+26588\d{7})$")
EMAIL_PATTERN = re.compile(r"^[a-z]+@gmail\.com$")


def validate_phone(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    cleaned = value.strip().replace(" ", "")
    if not PHONE_PATTERN.fullmatch(cleaned):
        raise ValueError("Phone number must start with 099, 098, 088, +26599, +26598 or +26588")
    return cleaned


def validate_email(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    cleaned = value.strip()
    if not EMAIL_PATTERN.fullmatch(cleaned):
        raise ValueError('Email must be in the format "example@gmail.com" using lowercase letters only')
    return cleaned


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserSignup(BaseModel):
    username: str
    password: str
    full_name: str
    role: Literal["admin", "teacher"] = "teacher"
    subject: str | None = None
    sex: str | None = None
    phone: str | None = None
    email: str | None = None
    qualification: str | None = None
    profile_image: str | None = None

    _validate_phone = field_validator("phone")(validate_phone)
    _validate_email = field_validator("email")(validate_email)


class UserOut(ORMModel):
    id: int
    username: str
    role: str
    status: str
    full_name: str
    profile_image: str | None = None


class StudentBase(BaseModel):
    full_name: str
    sex: str
    age: int | None = None
    admission_number: str | None = None
    class_name: str
    guardian_name: str | None = None
    guardian_contact: str | None = None
    address: str | None = None


class StudentCreate(StudentBase):
    _validate_guardian_contact = field_validator("guardian_contact")(validate_phone)


class StudentUpdate(StudentBase):
    _validate_guardian_contact = field_validator("guardian_contact")(validate_phone)


class StudentOut(StudentBase, ORMModel):
    id: int


class TeacherBase(BaseModel):
    full_name: str
    sex: str | None = None
    subject: str
    phone: str | None = None
    email: str | None = None
    qualification: str | None = None
    profile_image: str | None = None
    approved: bool = False
    user_id: int | None = None
    assigned_forms: list[str] = []


class TeacherCreate(TeacherBase):
    _validate_phone = field_validator("phone")(validate_phone)
    _validate_email = field_validator("email")(validate_email)


class TeacherUpdate(TeacherBase):
    _validate_phone = field_validator("phone")(validate_phone)
    _validate_email = field_validator("email")(validate_email)


class TeacherOut(TeacherBase, ORMModel):
    id: int
    approved_subjects: list[str] = []
    account_status: str = "pending"


class ApproveTeacherRequest(BaseModel):
    forms: list[str]


class TeacherAccessRequestBase(BaseModel):
    requested_subject: str
    requested_forms: list[str]
    note: str | None = None


class TeacherAccessRequestCreate(TeacherAccessRequestBase):
    pass


class TeacherAccessRequestApprove(BaseModel):
    admin_note: str | None = None


class TeacherAccessRequestOut(ORMModel):
    id: int
    teacher_id: int
    teacher_name: str
    requested_subject: str
    requested_forms: list[str]
    note: str | None = None
    status: str
    admin_note: str | None = None


class PermissionContext(BaseModel):
    user_id: int
    role: str
    allowed_forms: list[str]
    allowed_subjects: list[str]


class AttendanceBase(BaseModel):
    student_id: int
    date: str
    status: Literal["Present", "Absent", "Late"]
    note: str | None = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(AttendanceBase):
    pass


class AttendanceOut(AttendanceBase, ORMModel):
    id: int
    student: StudentOut


class FeeBase(BaseModel):
    student_id: int | None = None
    student_name: str
    expected_amount: float
    amount_paid: float
    fully_paid: bool
    note: str | None = None


class FeeCreate(FeeBase):
    pass


class FeeUpdate(FeeBase):
    pass


class FeeOut(FeeBase, ORMModel):
    id: int
    balance: float


class SubjectScore(BaseModel):
    subject: str
    score: float


class ExamRecordBase(BaseModel):
    student_id: int | None = None
    student_name: str
    class_name: str
    exam_name: str = "Main Exam"
    term: str | None = None
    subject_scores: list[SubjectScore]


class ExamRecordCreate(ExamRecordBase):
    pass


class ExamRecordUpdate(ExamRecordBase):
    pass


class ExamRecordOut(ExamRecordBase, ORMModel):
    id: int
    english: float
    mathematics: float
    science: float
    social_studies: float
    average: float
    total_score: float
    result_label: str
    overall_result: str
    english_failed: bool
    passed: bool
    rank: int | None = None


class TimetableEntryBase(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    subject: str
    teacher_name: str | None = None
    room: str | None = None
    note: str | None = None


class TimetableEntryCreate(TimetableEntryBase):
    pass


class TimetableEntryOut(TimetableEntryBase, ORMModel):
    id: int


class TimetableBase(BaseModel):
    title: str
    timetable_type: Literal["subject", "exam"]
    class_name: str
    is_posted: bool = False
    note: str | None = None
    days: list[str]
    entries: list[TimetableEntryCreate]


class TimetableCreate(TimetableBase):
    pass


class TimetableUpdate(TimetableBase):
    pass


class TimetableOut(ORMModel):
    id: int
    title: str
    timetable_type: str
    class_name: str
    is_posted: bool
    note: str | None = None
    days: list[str]
    entries: list[TimetableEntryOut]


class DashboardSummary(BaseModel):
    total_students: int
    total_teachers: int
    attendance_rate: float
    fees_collected: float
    pending_teacher_accounts: int
    posted_timetables: int
    exam_records: int
    top_students: list[ExamRecordOut]
