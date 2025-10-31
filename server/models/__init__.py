# Models package initialization
from .school import School
from .staff import Staff
from .teacher import Teacher
from .academic_year import AcademicYear
from .subject import Subject
from .class_model import Class
from .class_teacher import ClassTeacher
from .parent import Parent
from .student import Student
from .fee_type import FeeType
from .fee_management import FeeManagement
from .fee_detail import FeeDetail
from .inventory import Inventory
from .attendance import Attendance
from .assessment import AssessmentMark
from .exam import ExamMark
from .logs import Log

__all__ = [
    "School",
    "Staff", 
    "Teacher",
    "AcademicYear",
    "Subject",
    "Class",
    "ClassTeacher",
    "Parent",
    "Student",
    "FeeType",
    "FeeManagement",
    "FeeDetail",
    "Inventory",
    "Attendance",
    "AssessmentMark",
    "ExamMark",
    "Log"
]
