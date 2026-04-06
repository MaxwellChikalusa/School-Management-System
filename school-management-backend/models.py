from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="teacher")
    status = Column(String, nullable=False, default="approved")
    full_name = Column(String, nullable=False)
    profile_image = Column(Text, nullable=True)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True, nullable=False)
    sex = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    admission_number = Column(String, unique=True, nullable=True)
    class_name = Column(String, index=True, nullable=False)
    guardian_name = Column(String, nullable=True)
    guardian_contact = Column(String, nullable=True)
    address = Column(String, nullable=True)


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    sex = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    profile_image = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved = Column(Boolean, default=False, nullable=False)

    user = relationship("User")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    status = Column(String, nullable=False)
    note = Column(String, nullable=True)

    student = relationship("Student")


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String, nullable=False)
    expected_amount = Column(Float, nullable=False, default=0)
    amount_paid = Column(Float, nullable=False, default=0)
    fully_paid = Column(Boolean, nullable=False, default=False)
    note = Column(String, nullable=True)

    student = relationship("Student")


class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String, nullable=False)
    class_name = Column(String, nullable=False)
    exam_name = Column(String, nullable=False, default="Main Exam")
    term = Column(String, nullable=True)
    subject_scores = Column(Text, nullable=True)
    english = Column(Float, nullable=False, default=0)
    mathematics = Column(Float, nullable=False, default=0)
    science = Column(Float, nullable=False, default=0)
    social_studies = Column(Float, nullable=False, default=0)
    average = Column(Float, nullable=False, default=0)
    total_score = Column(Float, nullable=False, default=0)
    result_label = Column(String, nullable=False, default="Failed")
    overall_result = Column(String, nullable=False, default="Failed")
    english_failed = Column(Boolean, nullable=False, default=False)
    passed = Column(Boolean, nullable=False, default=False)
    rank = Column(Integer, nullable=True)

    student = relationship("Student")


class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    timetable_type = Column(String, nullable=False, default="subject")
    class_name = Column(String, nullable=False)
    is_posted = Column(Boolean, nullable=False, default=False)
    note = Column(String, nullable=True)
    days = Column(Text, nullable=False)
    entries = relationship(
        "TimetableEntry",
        back_populates="timetable",
        cascade="all, delete-orphan",
    )


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.id"), nullable=False)
    day_of_week = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    teacher_name = Column(String, nullable=True)
    room = Column(String, nullable=True)
    note = Column(String, nullable=True)

    timetable = relationship("Timetable", back_populates="entries")
