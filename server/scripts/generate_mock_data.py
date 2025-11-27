"""
Script to generate mock data for all tables in the database.
- Creates 10 schools
- For the first school: 20 records for each service
- For other schools: 100+ records in each table
- Generates staff credentials document
"""

import asyncio
import random
import string
from datetime import datetime, date, timedelta
from typing import List, Dict
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Import database and models
import sys
import os

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
sys.path.insert(0, parent_dir)

from database import AsyncSessionLocal, engine
from utils.password_utils import hash_password
from models.school import School
from models.staff import Staff
from models.student import Student
from models.parent import Parent
from models.class_model import Class
from models.subject import Subject
from models.academic_year import AcademicYear
from models.teacher import Teacher
from models.test_mark import TestMark
from models.exam import ExamMark
from models.attendance import Attendance
from models.fee_type import FeeType
from models.fee_management import FeeManagement
from models.fee_invoice import FeeInvoice
from models.fee_detail import FeeDetail
from models.expense import Expense
from models.inventory import Inventory
from models.class_teacher import ClassTeacher
from models.payment_season import PaymentSeason
from models.school_payment_record import SchoolPaymentRecord

# Password hashing - using utility from codebase

# Mock data generators
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Dorothy", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Jason", "Rebecca", "Edward", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
    "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
    "Benjamin", "Samantha", "Samuel", "Katherine", "Frank", "Christine", "Gregory", "Debra",
    "Raymond", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Virginia",
    "Dennis", "Maria", "Jerry", "Heather", "Tyler", "Diane", "Aaron", "Julie",
    "Jose", "Joyce", "Adam", "Victoria", "Nathan", "Kelly", "Zachary", "Christina",
    "Kyle", "Joan", "Noah", "Evelyn", "Ethan", "Judith", "Jeremy", "Megan"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
    "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
    "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
    "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards",
    "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
    "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly",
    "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks",
    "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
    "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross",
    "Foster", "Jimenez", "Powell", "Jenkins", "Perry", "Patterson", "Black", "Henderson"
]

SCHOOL_NAMES = [
    "Kigali Primary School", "Rwanda Excellence Academy", "Green Valley School",
    "Mountain View Elementary", "Sunshine International School", "Hope Academy",
    "Bright Future School", "Unity Primary School", "Excellence Academy",
    "Rwanda Scholars Institute"
]

SUBJECTS = [
    "Mathematics", "English", "Kinyarwanda", "Science", "Social Studies",
    "French", "Physical Education", "Arts", "Music", "Computer Science",
    "History", "Geography", "Biology", "Chemistry", "Physics"
]

CLASS_TYPES = ["Primary", "Upper Primary", "Secondary", "Lower Secondary", "Upper Secondary"]
CLASS_NAMES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", 
               "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]

TERMS = ["1st Term", "2nd Term", "3rd Term", "Term 1", "Term 2", "Term 3",
         "First Term", "Second Term", "Third Term"]

STATUSES = ["Pass", "Fail", "Pending", "Active", "Inactive", "Approved", "Rejected"]
GENDERS = ["Male", "Female"]
EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Temporary"]
STAFF_ROLES = ["Principal", "Vice Principal", "Teacher", "Administrator", "Accountant", "Secretary"]
STAFF_TITLES = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."]

PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHEQUE", "ONLINE_PAYMENT"]
EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Supplies", "Maintenance", "Transport", "Food", "Other"]
INVENTORY_SERVICES = ["Cleaning", "Catering", "Security", "Maintenance", "Transport", "IT Support"]

def generate_password(length=12) -> str:
    """Generate a random password with letters and numbers (max 72 bytes for bcrypt)"""
    # Bcrypt has a 72-byte limit, so we'll use max 12 characters to be safe
    max_length = min(length, 12)
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(max_length))

# hash_password is imported from utils.password_utils

def random_date(start_date: date, end_date: date) -> date:
    """Generate a random date between start and end"""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return start_date + timedelta(days=random_days)

def random_datetime(start_date: datetime, end_date: datetime) -> datetime:
    """Generate a random datetime between start and end"""
    time_between = end_date - start_date
    seconds_between = time_between.total_seconds()
    random_seconds = random.randrange(int(seconds_between))
    return start_date + timedelta(seconds=random_seconds)

async def create_schools(session: AsyncSession, count: int = 10) -> List[uuid.UUID]:
    """Create schools"""
    print(f"Creating {count} schools...")
    school_ids = []
    
    for i in range(count):
        school = School(
            school_id=uuid.uuid4(),
            school_name=SCHOOL_NAMES[i] if i < len(SCHOOL_NAMES) else f"School {i+1}",
            school_address=f"{random.randint(1, 999)} Main Street, Kigali, Rwanda",
            school_ownership=random.choice(["Public", "Private", "Religious"]),
            school_phone=f"+250{random.randint(700000000, 799999999)}",
            school_email=f"info@{SCHOOL_NAMES[i].lower().replace(' ', '')}.rw" if i < len(SCHOOL_NAMES) else f"school{i+1}@example.com",
            is_active=True,
            is_deleted=False
        )
        session.add(school)
        school_ids.append(school.school_id)
    
    await session.commit()
    print(f"✅ Created {count} schools")
    return school_ids

async def create_academic_years(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create academic years"""
    print("Creating academic years...")
    academic_years = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_academic_years = []
        
        for i in range(count):
            year = 2020 + (i % 5)
            academic = AcademicYear(
                academic_id=uuid.uuid4(),
                school_id=school_id,
                academic_name=f"{year}-{year+1}",
                start_date=date(year, 1, 1),
                end_date=date(year+1, 12, 31),
                is_current=(i == count - 1),
                is_deleted=False
            )
            session.add(academic)
            school_academic_years.append(academic)
        
        await session.commit()
        academic_years[school_id] = [ay.academic_id for ay in school_academic_years]
    
    print("✅ Created academic years")
    return academic_years

async def create_staff(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID) -> Dict:
    """Create staff and return credentials"""
    print("Creating staff...")
    staff_credentials = {}
    all_staff = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_staff = []
        
        for i in range(count):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            staff_name = f"{first_name} {last_name}"
            # Make email unique using UUID and index
            unique_id = f"{i}{uuid.uuid4().hex[:8]}"
            if school_id == main_school_id:
                school_domain = SCHOOL_NAMES[0].lower().replace(' ', '').replace("'", "")
                email = f"{first_name.lower()}.{last_name.lower()}{unique_id}@{school_domain}.rw"
            else:
                email = f"{first_name.lower()}.{last_name.lower()}{unique_id}@school{i}.com"
            
            password = generate_password()
            hashed_password = hash_password(password)
            
            staff = Staff(
                staff_id=uuid.uuid4(),
                school_id=school_id,
                staff_name=staff_name,
                staff_dob=random_date(date(1970, 1, 1), date(2000, 12, 31)),
                staff_gender=random.choice(GENDERS),
                staff_title=random.choice(STAFF_TITLES),
                staff_role=random.choice(STAFF_ROLES),
                employment_type=random.choice(EMPLOYMENT_TYPES),
                qualifications=f"Bachelor's in Education, {random.choice(['Mathematics', 'Science', 'English', 'Arts'])}",
                experience=f"{random.randint(1, 20)} years of teaching experience",
                email=email,
                phone=f"+250{random.randint(700000000, 799999999)}",
                password=hashed_password,
                is_active=True,
                is_deleted=False
            )
            session.add(staff)
            school_staff.append(staff)
            
            # Store credentials
            school_name = await session.get(School, school_id)
            staff_credentials[str(staff.staff_id)] = {
                "staff_name": staff_name,
                "email": email,
                "password": password,
                "school_name": school_name.school_name if school_name else "Unknown"
            }
        
        await session.commit()
        all_staff[school_id] = [s.staff_id for s in school_staff]
    
    print("✅ Created staff")
    return {"staff_ids": all_staff, "credentials": staff_credentials}

async def create_teachers(session: AsyncSession, staff_data: Dict):
    """Create teachers from staff"""
    print("Creating teachers...")
    all_teachers = {}
    
    for school_id, staff_ids in staff_data["staff_ids"].items():
        school_teachers = []
        # Only create teachers for staff with teacher role (approximately 70%)
        teacher_staff = staff_ids[:int(len(staff_ids) * 0.7)]
        
        for staff_id in teacher_staff:
            teacher = Teacher(
                teacher_id=uuid.uuid4(),
                staff_id=staff_id,
                specialized=random.choice(SUBJECTS),
                is_active=True,
                is_deleted=False
            )
            session.add(teacher)
            school_teachers.append(teacher)
        
        await session.commit()
        all_teachers[school_id] = [t.teacher_id for t in school_teachers]
    
    print("✅ Created teachers")
    return all_teachers

async def create_subjects(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create subjects"""
    print("Creating subjects...")
    all_subjects = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_subjects = []
        
        # Always include core subjects
        core_subjects = SUBJECTS[:10] if count >= 10 else SUBJECTS[:count]
        
        for i, subject_name in enumerate(core_subjects):
            subject = Subject(
                subj_id=uuid.uuid4(),
                school_id=school_id,
                subj_name=subject_name,
                subj_desc=f"Course description for {subject_name}",
                is_deleted=False
            )
            session.add(subject)
            school_subjects.append(subject)
        
        # Add more subjects if needed
        for i in range(len(core_subjects), count):
            subject = Subject(
                subj_id=uuid.uuid4(),
                school_id=school_id,
                subj_name=f"{random.choice(SUBJECTS)} {i+1}",
                subj_desc=f"Course description for subject {i+1}",
                is_deleted=False
            )
            session.add(subject)
            school_subjects.append(subject)
        
        await session.commit()
        all_subjects[school_id] = [s.subj_id for s in school_subjects]
    
    print("✅ Created subjects")
    return all_subjects

async def create_classes(session: AsyncSession, school_ids: List[uuid.UUID], teachers: Dict, main_school_id: uuid.UUID):
    """Create classes"""
    print("Creating classes...")
    all_classes = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_classes = []
        school_teachers = teachers.get(school_id, [])
        
        if not school_teachers:
            print(f"⚠️  No teachers for school {school_id}, skipping classes")
            all_classes[school_id] = []
            continue
        
        for i in range(count):
            class_name = CLASS_NAMES[i % len(CLASS_NAMES)] if i < len(CLASS_NAMES) * 10 else f"Grade {i+1}"
            class_type = random.choice(CLASS_TYPES)
            manager_id = random.choice(school_teachers)
            
            cls = Class(
                cls_id=uuid.uuid4(),
                cls_name=class_name,
                cls_type=class_type,
                cls_manager=manager_id,
                is_deleted=False
            )
            session.add(cls)
            school_classes.append(cls)
        
        await session.commit()
        all_classes[school_id] = [c.cls_id for c in school_classes]
    
    print("✅ Created classes")
    return all_classes

async def create_parents(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create parents"""
    print("Creating parents...")
    all_parents = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_parents = []
        
        for i in range(count):
            parent = Parent(
                par_id=uuid.uuid4(),
                school_id=school_id,
                mother_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                father_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                mother_phone=f"+250{random.randint(700000000, 799999999)}",
                father_phone=f"+250{random.randint(700000000, 799999999)}",
                mother_email=f"mother{i}@example.com",
                father_email=f"father{i}@example.com",
                par_address=f"{random.randint(1, 999)} Street, Kigali",
                par_type=random.choice(["Both", "Mother Only", "Father Only", "Guardian"]),
                is_deleted=False
            )
            session.add(parent)
            school_parents.append(parent)
        
        await session.commit()
        all_parents[school_id] = [p.par_id for p in school_parents]
    
    print("✅ Created parents")
    return all_parents

async def create_students(session: AsyncSession, school_ids: List[uuid.UUID], parents: Dict, classes: Dict, main_school_id: uuid.UUID):
    """Create students"""
    print("Creating students...")
    all_students = {}
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_students = []
        school_parents = parents.get(school_id, [])
        school_classes = classes.get(school_id, [])
        
        if not school_parents or not school_classes:
            print(f"⚠️  Missing parents or classes for school {school_id}")
            all_students[school_id] = []
            continue
        
        for i in range(count):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            student_name = f"{first_name} {last_name}"
            
            student = Student(
                std_id=uuid.uuid4(),
                school_id=school_id,
                par_id=random.choice(school_parents),
                std_code=f"STD-{random.randint(10000000, 99999999)}",
                std_name=student_name,
                std_dob=f"{random.randint(2005, 2015)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                std_gender=random.choice(GENDERS),
                previous_school=random.choice(["None", "Previous School A", "Previous School B"]),
                started_class=random.choice(school_classes),
                current_class=random.choice(school_classes),
                status=random.choice(["Active", "Graduated", "Transferred"]),
                is_deleted=False
            )
            session.add(student)
            school_students.append(student)
        
        await session.commit()
        all_students[school_id] = [s.std_id for s in school_students]
    
    print("✅ Created students")
    return all_students

async def create_test_marks(session: AsyncSession, school_ids: List[uuid.UUID], students: Dict, subjects: Dict, classes: Dict, academic_years: Dict, main_school_id: uuid.UUID):
    """Create test marks"""
    print("Creating test marks...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_students = students.get(school_id, [])
        school_subjects = subjects.get(school_id, [])
        school_classes = classes.get(school_id, [])
        school_academic_years = academic_years.get(school_id, [])
        
        if not all([school_students, school_subjects, school_classes, school_academic_years]):
            continue
        
        for _ in range(count):
            for student_id in random.sample(school_students, min(5, len(school_students))):
                for subject_id in random.sample(school_subjects, min(3, len(school_subjects))):
                    test_mark = TestMark(
                        test_mark_id=uuid.uuid4(),
                        school_id=school_id,
                        std_id=student_id,
                        subj_id=subject_id,
                        cls_id=random.choice(school_classes),
                        academic_id=random.choice(school_academic_years),
                        term=random.choice(TERMS),
                        test_avg_mark=random.uniform(50, 100),
                        test_mark=random.uniform(0, 100),
                        status=random.choice(STATUSES),
                        is_published=random.choice([True, False]),
                        is_deleted=False
                    )
                    session.add(test_mark)
                    total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} test marks")

async def create_exam_marks(session: AsyncSession, school_ids: List[uuid.UUID], students: Dict, subjects: Dict, classes: Dict, academic_years: Dict, main_school_id: uuid.UUID):
    """Create exam marks"""
    print("Creating exam marks...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_students = students.get(school_id, [])
        school_subjects = subjects.get(school_id, [])
        school_classes = classes.get(school_id, [])
        school_academic_years = academic_years.get(school_id, [])
        
        if not all([school_students, school_subjects, school_classes, school_academic_years]):
            continue
        
        for _ in range(count):
            for student_id in random.sample(school_students, min(5, len(school_students))):
                for subject_id in random.sample(school_subjects, min(3, len(school_subjects))):
                    exam_mark = ExamMark(
                        exam_mark_id=uuid.uuid4(),
                        school_id=school_id,
                        std_id=student_id,
                        subj_id=subject_id,
                        cls_id=random.choice(school_classes),
                        academic_id=random.choice(school_academic_years),
                        term=random.choice(TERMS),
                        exam_avg_mark=random.uniform(50, 100),
                        exam_mark=random.uniform(0, 100),
                        status=random.choice(STATUSES),
                        is_published=random.choice([True, False]),
                        is_deleted=False
                    )
                    session.add(exam_mark)
                    total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} exam marks")

async def create_attendance(session: AsyncSession, school_ids: List[uuid.UUID], teachers: Dict, students: Dict, subjects: Dict, classes: Dict, main_school_id: uuid.UUID):
    """Create attendance records"""
    print("Creating attendance records...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_teachers = teachers.get(school_id, [])
        school_students = students.get(school_id, [])
        school_subjects = subjects.get(school_id, [])
        school_classes = classes.get(school_id, [])
        
        if not all([school_teachers, school_students, school_subjects]):
            continue
        
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 12, 31)
        
        for _ in range(count):
            attendance = Attendance(
                att_id=uuid.uuid4(),
                school_id=school_id,
                teacher_id=random.choice(school_teachers),
                std_id=random.choice(school_students),
                subj_id=random.choice(school_subjects),
                cls_id=random.choice(school_classes) if school_classes else None,
                date=random_datetime(start_date, end_date),
                status=random.choice(["Present", "Absent", "Late", "Excused"]),
                is_deleted=False
            )
            session.add(attendance)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} attendance records")

async def create_fee_types(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create fee types"""
    print("Creating fee types...")
    all_fee_types = {}
    
    fee_type_names = ["Tuition", "Registration", "Library", "Sports", "Laboratory", "Transport", "Meals", "Uniform"]
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_fee_types = []
        
        for i in range(count):
            fee_type = FeeType(
                fee_type_id=uuid.uuid4(),
                school_id=school_id,
                fee_type_name=fee_type_names[i % len(fee_type_names)] if i < len(fee_type_names) * 10 else f"Fee Type {i+1}",
                description=f"Description for fee type {i+1}",
                amount_to_pay=random.uniform(1000, 50000),
                is_active="true",
                is_deleted=False
            )
            session.add(fee_type)
            school_fee_types.append(fee_type)
        
        await session.commit()
        all_fee_types[school_id] = [ft.fee_type_id for ft in school_fee_types]
    
    print("✅ Created fee types")
    return all_fee_types

async def create_fee_management(session: AsyncSession, school_ids: List[uuid.UUID], students: Dict, fee_types: Dict, academic_years: Dict, main_school_id: uuid.UUID):
    """Create fee management records"""
    print("Creating fee management records...")
    all_fees = {}
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_students = students.get(school_id, [])
        school_fee_types = fee_types.get(school_id, [])
        school_academic_years = academic_years.get(school_id, [])
        
        if not all([school_students, school_fee_types, school_academic_years]):
            continue
        
        school_fees = []
        for _ in range(count):
            fee = FeeManagement(
                fee_id=uuid.uuid4(),
                school_id=school_id,
                std_id=random.choice(school_students),
                fee_type_id=random.choice(school_fee_types),
                academic_id=random.choice(school_academic_years),
                term=random.choice(TERMS),
                amount_paid=random.uniform(0, 50000),
                status=random.choice(["pending", "paid", "overdue", "cancelled"]),
                is_deleted=False
            )
            session.add(fee)
            school_fees.append(fee)
            total_created += 1
        
        await session.commit()
        all_fees[school_id] = [f.fee_id for f in school_fees]
    
    print(f"✅ Created {total_created} fee management records")
    return all_fees

async def create_fee_invoices(session: AsyncSession, school_ids: List[uuid.UUID], fees: Dict, main_school_id: uuid.UUID):
    """Create fee invoices"""
    print("Creating fee invoices...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_fees = fees.get(school_id, [])
        
        if not school_fees:
            continue
        
        for _ in range(count):
            invoice = FeeInvoice(
                invoice_id=uuid.uuid4(),
                fee_id=random.choice(school_fees),
                school_id=school_id,
                amount=random.uniform(1000, 50000),
                is_deleted=False
            )
            session.add(invoice)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} fee invoices")

async def create_fee_details(session: AsyncSession, school_ids: List[uuid.UUID], fees: Dict, main_school_id: uuid.UUID):
    """Create fee details"""
    print("Creating fee details...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_fees = fees.get(school_id, [])
        
        if not school_fees:
            continue
        
        for _ in range(count):
            detail = FeeDetail(
                fee_detail_id=uuid.uuid4(),
                school_id=school_id,
                fee_id=random.choice(school_fees),
                amount=random.uniform(100, 10000),
                status=random.choice(["pending", "paid", "overdue"]),
                is_deleted=False
            )
            session.add(detail)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} fee details")

async def create_expenses(session: AsyncSession, school_ids: List[uuid.UUID], staff_data: Dict, academic_years: Dict, main_school_id: uuid.UUID):
    """Create expenses"""
    print("Creating expenses...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_staff = staff_data["staff_ids"].get(school_id, [])
        school_academic_years = academic_years.get(school_id, [])
        
        for _ in range(count):
            expense = Expense(
                expense_id=uuid.uuid4(),
                school_id=school_id,
                academic_id=random.choice(school_academic_years) if school_academic_years else None,
                category=random.choice(EXPENSE_CATEGORIES),
                title=f"Expense {random.randint(1, 1000)}",
                description=f"Description for expense",
                amount=random.uniform(1000, 100000),
                payment_method=random.choice(PAYMENT_METHODS),
                status=random.choice(["PENDING", "APPROVED", "PAID", "REJECTED", "ARCHIVED"]),
                expense_date=random_date(date(2024, 1, 1), date(2024, 12, 31)),
                invoice_image=[],
                added_by=random.choice(school_staff) if school_staff else None,
                approved_by=random.choice(school_staff) if school_staff else None,
                is_deleted=False
            )
            session.add(expense)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} expenses")

async def create_inventory(session: AsyncSession, school_ids: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create inventory records"""
    print("Creating inventory records...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        
        for i in range(count):
            inventory = Inventory(
                inv_id=uuid.uuid4(),
                school_id=school_id,
                inv_name=f"Inventory Item {i+1}",
                inv_service=random.choice(INVENTORY_SERVICES),
                inv_desc=f"Description for inventory item {i+1}",
                inv_date=random_date(date(2024, 1, 1), date(2024, 12, 31)),
                inv_price=random.uniform(100, 10000),
                inv_status=random.choice(["Available", "In Use", "Maintenance", "Retired"]),
                is_deleted=False
            )
            session.add(inventory)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} inventory records")

async def create_class_teachers(session: AsyncSession, school_ids: List[uuid.UUID], teachers: Dict, subjects: Dict, classes: Dict, main_school_id: uuid.UUID):
    """Create class teacher assignments"""
    print("Creating class teacher assignments...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        school_teachers = teachers.get(school_id, [])
        school_subjects = subjects.get(school_id, [])
        school_classes = classes.get(school_id, [])
        
        if not all([school_teachers, school_subjects, school_classes]):
            continue
        
        for _ in range(count):
            start = random_date(date(2024, 1, 1), date(2024, 6, 30))
            end = random_date(start, date(2024, 12, 31))
            
            assignment = ClassTeacher(
                id=uuid.uuid4(),
                teacher_id=random.choice(school_teachers),
                subj_id=random.choice(school_subjects),
                cls_id=random.choice(school_classes),
                start_date=start,
                end_date=end,
                is_deleted=False
            )
            session.add(assignment)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} class teacher assignments")

async def create_payment_seasons(session: AsyncSession):
    """Create payment seasons"""
    print("Creating payment seasons...")
    seasons = []
    
    for i in range(100):
        year = 2020 + (i % 5)
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        
        season = PaymentSeason(
            pay_id=uuid.uuid4(),
            season_pay_name=f"Season {i+1} - {year}",
            from_date=start,
            end_date=end,
            amount=random.uniform(10000, 100000),
            coupon_number=f"CPN-{random.randint(100000, 999999)}",
            status=random.choice(["active", "inactive", "expired"]),
            is_deleted=False
        )
        session.add(season)
        seasons.append(season)
    
    await session.commit()
    print(f"✅ Created {len(seasons)} payment seasons")
    return [s.pay_id for s in seasons]

async def create_school_payment_records(session: AsyncSession, school_ids: List[uuid.UUID], payment_seasons: List[uuid.UUID], main_school_id: uuid.UUID):
    """Create school payment records"""
    print("Creating school payment records...")
    total_created = 0
    
    for school_id in school_ids:
        count = 20 if school_id == main_school_id else 100
        
        for _ in range(count):
            record = SchoolPaymentRecord(
                record_id=uuid.uuid4(),
                school_id=school_id,
                payment_id=random.choice(payment_seasons),
                status=random.choice(["pending", "paid", "overdue", "cancelled"]),
                date=random_date(date(2024, 1, 1), date(2024, 12, 31)),
                is_deleted=False
            )
            session.add(record)
            total_created += 1
        
        await session.commit()
    
    print(f"✅ Created {total_created} school payment records")

def save_staff_credentials(credentials: Dict, filename: str = "staff_credentials.md"):
    """Save staff credentials to markdown file"""
    print(f"Saving staff credentials to {filename}...")
    
    # Save in server directory
    filepath = os.path.join(parent_dir, filename)
    with open(filepath, "w") as f:
        f.write("# Staff Credentials\n\n")
        f.write("This document contains login credentials for all staff members.\n\n")
        f.write("| Staff Name | Email | Password | School |\n")
        f.write("|------------|-------|----------|--------|\n")
        
        for staff_id, creds in credentials.items():
            f.write(f"| {creds['staff_name']} | {creds['email']} | {creds['password']} | {creds['school_name']} |\n")
    
    print(f"✅ Saved credentials to {filename}")

async def main():
    """Main function to generate all mock data"""
    print("=" * 60)
    print("Starting Mock Data Generation")
    print("=" * 60)
    
    async with AsyncSessionLocal() as session:
        try:
            # Create schools
            school_ids = await create_schools(session, 10)
            main_school_id = school_ids[0]
            
            # Create academic years
            academic_years = await create_academic_years(session, school_ids, main_school_id)
            
            # Create staff and get credentials
            staff_data = await create_staff(session, school_ids, main_school_id)
            
            # Create teachers
            teachers = await create_teachers(session, staff_data)
            
            # Create subjects
            subjects = await create_subjects(session, school_ids, main_school_id)
            
            # Create classes
            classes = await create_classes(session, school_ids, teachers, main_school_id)
            
            # Create parents
            parents = await create_parents(session, school_ids, main_school_id)
            
            # Create students
            students = await create_students(session, school_ids, parents, classes, main_school_id)
            
            # Create test marks
            await create_test_marks(session, school_ids, students, subjects, classes, academic_years, main_school_id)
            
            # Create exam marks
            await create_exam_marks(session, school_ids, students, subjects, classes, academic_years, main_school_id)
            
            # Create attendance
            await create_attendance(session, school_ids, teachers, students, subjects, classes, main_school_id)
            
            # Create fee types
            fee_types = await create_fee_types(session, school_ids, main_school_id)
            
            # Create fee management
            fees = await create_fee_management(session, school_ids, students, fee_types, academic_years, main_school_id)
            
            # Create fee invoices
            await create_fee_invoices(session, school_ids, fees, main_school_id)
            
            # Create fee details
            await create_fee_details(session, school_ids, fees, main_school_id)
            
            # Create expenses
            await create_expenses(session, school_ids, staff_data, academic_years, main_school_id)
            
            # Create inventory
            await create_inventory(session, school_ids, main_school_id)
            
            # Create class teachers
            await create_class_teachers(session, school_ids, teachers, subjects, classes, main_school_id)
            
            # Create payment seasons
            payment_seasons = await create_payment_seasons(session)
            
            # Create school payment records
            await create_school_payment_records(session, school_ids, payment_seasons, main_school_id)
            
            # Save staff credentials
            save_staff_credentials(staff_data["credentials"], "staff_credentials.md")
            
            print("=" * 60)
            print("✅ Mock Data Generation Complete!")
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(main())

