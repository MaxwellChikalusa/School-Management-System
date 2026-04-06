from typing import Literal

from pydantic import BaseModel, ConfigDict


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
    pass


class StudentUpdate(StudentBase):
    pass


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


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(TeacherBase):
    pass


class TeacherOut(TeacherBase, ORMModel):
    id: int


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
