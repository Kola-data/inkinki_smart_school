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
from .fee_invoice import FeeInvoice
from .expense import Expense
from .attendance import Attendance
from .assessment import AssessmentMark
from .test_mark import TestMark
from .exam import ExamMark
from .logs import Log
from .password_reset import PasswordReset
from .inventory import Inventory
from .system_user import SystemUser
from .payment_season import PaymentSeason
from .school_payment_record import SchoolPaymentRecord

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
    "FeeInvoice",
    "Expense",
    "Attendance",
    "AssessmentMark",
    "TestMark",
    "ExamMark",
    "Log",
    "PasswordReset",
    "Inventory",
    "SystemUser",
    "PaymentSeason",
    "SchoolPaymentRecord"
]
