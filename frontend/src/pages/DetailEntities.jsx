import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiGrid, FiLayers, FiDownload,FiArrowLeft , FiRefreshCw, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusMessage from '../components/StatusMessage';
import Input from '../components/Input';
import Select from '../components/Select';
import MultiSelect from '../components/MultiSelect';
import { Link } from 'react-router-dom';


const DetailEntities = () => {
    const { user, logout } = useAuthStore();

    // === States from your code ===
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [semesterCourses, setSemesterCourses] = useState([]);
    const [studentCourses, setStudentCourses] = useState([]);
    const [editingDept, setEditingDept] = useState(null);
    const [editingSem, setEditingSem] = useState(null);
    const [editingRoom, setEditingRoom] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseFormData, setCourseFormData] = useState({ semesterId: '', examDate: '' });
    const [studentFormData, setStudentFormData] = useState({ courseIds: [] });
    const [loading, setLoading] = useState(true);
    const [formStatus, setFormStatus] = useState('');
    const [showMessage, setShowMessage] = useState(false);

    const [activeTab, setActiveTab] = useState('students'); // Tab switching

    const triggerMessage = () => setShowMessage(true);

    // === Load data ===
    const loadCoreData = async () => {
        setLoading(true);
        try {
            const [deps, sems, rms, crs, studs, semCoursesRes, studCoursesRes] = await Promise.all([
                apiClient.get('/catalog/departments'),
                apiClient.get('/catalog/semesters'),
                apiClient.get('/catalog/rooms'),
                apiClient.get('/catalog/courses'),
                apiClient.get('/students'),
                apiClient.get('/catalog/semester-courses').catch(() => ({ data: [] })),
                apiClient.get('/catalog/student-courses').catch(() => ({ data: [] })),
            ]);
            setDepartments(deps.data);
            setSemesters(sems.data);
            setRooms(rms.data);
            setCourses(crs.data);
            setStudents(studs.data);
            setSemesterCourses(semCoursesRes.data || []);
            setStudentCourses(studCoursesRes.data || []);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCoreData();
    }, []);

    // === CRUD handlers ===
    const handleEntityCreate = async (endpoint, payload) => {
        try {
            const response = await apiClient.post(endpoint, payload);
            const newEntity = response.data;
            setFormStatus('Saved successfully');
            triggerMessage();

            if (endpoint.includes('/catalog/departments')) setDepartments((prev) => [...prev, newEntity]);
            else if (endpoint.includes('/catalog/semesters')) setSemesters((prev) => [...prev, newEntity]);
            else if (endpoint.includes('/catalog/rooms')) setRooms((prev) => [...prev, newEntity]);
            else if (endpoint.includes('/catalog/courses')) setCourses((prev) => [...prev, newEntity]);
            else if (endpoint.includes('/students')) setStudents((prev) => [...prev, newEntity]);
        } catch (error) {
            setFormStatus(error.response?.data?.message || 'Failed to save');
            triggerMessage();
        }
    };

    const handleEntityUpdate = async (endpoint, id, payload) => {
        try {
            await apiClient.put(`${endpoint}/${id}`, payload);
            setFormStatus('Updated successfully');
            triggerMessage();

            // Student / Course relationships handled outside this snippet
            await loadCoreData();
        } catch (error) {
            setFormStatus(error.response?.data?.message || 'Failed to update');
            triggerMessage();
        }
    };

    const handleEntityDelete = async (endpoint, id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await apiClient.delete(`${endpoint}/${id}`);
            setFormStatus('Deleted successfully');
            triggerMessage();
            await loadCoreData();
        } catch (error) {
            setFormStatus(error.response?.data?.message || 'Failed to delete');
            triggerMessage();
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen px-6 md:px-10 py-10 text-white space-y-10">
            <StatusMessage
                message={formStatus}
                show={showMessage}
                duration={3000}
                onClose={() => setShowMessage(false)}
            />
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Manage Entities</p>
                    <h1 className="text-4xl font-display">CRUD Panel</h1>
                    <div className="flex gap-2 items-center text-gray-400">
                        <FiArrowLeft />
                        <Link to="/dashboard" className="ml-2 underline">Back to Dashboard</Link>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => loadCoreData(activePlanId)}
                    className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
                >
                    <FiRefreshCw /> Refresh data
                </button>
            </header>
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                    {['students', 'rooms', 'departments', 'courses', 'semesters'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm sm:text-base ${activeTab === tab
                                ? 'bg-brand-500/20 border border-brand-500/40'
                                : 'bg-white/5 border border-white/10'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>


                {/* Entity Sections */}
                <div className="flex jutify-center items-center">
                    {activeTab === 'departments' && (
                        <div className="glass p-6 border border-white/10 space-y-4 w-full">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Departments</p>
                                <h3 className="text-xl font-display">Add / edit quickly</h3>
                            </div>
                            {editingDept ? (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityUpdate('/catalog/departments', editingDept.id, { name: formData.get('deptName') });
                                        setEditingDept(null);
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Department name" name="deptName" defaultValue={editingDept.name} required />
                                    <div className="flex gap-2">
                                        <div className='flex w-full justify-center items-center gap-3'>
                                            <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40 max-w-[200px]">
                                                Update
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setEditingDept(null)}
                                                className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityCreate('/catalog/departments', { name: formData.get('deptName') });
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Department name" name="deptName" placeholder="Computer Science" required />
                                    <div className='flex w-full justify-center items-center'>
                                        <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10 max-w-[200px]">
                                            Save department
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div>
                                <h3 className="text-xl font-display">All {activeTab}</h3>
                            </div>
                            <div className="border-t border-white/5 pt-3 space-y-2  overflow-auto max-h-[300px]">
                                {departments.map((dept) => (
                                    <div key={dept.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <span className="text-sm truncate flex-1">{dept.name}</span>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingDept(dept)}
                                                className="p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEntityDelete('/catalog/departments', dept.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'students' && (
                        <div className="glass p-6 border border-white/10 space-y-4 w-full">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Students</p>
                                <h3 className="text-xl font-display">Enroll & sync</h3>
                            </div>
                            {editingStudent ? (
                                <form
                                    className="space-y-3"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const selectElement = e.target.querySelector('[name="studentCourses"]');
                                        const courseIds = Array.from(selectElement.selectedOptions, (opt) => opt.value);

                                        setStudentFormData({ courseIds });

                                        await handleEntityUpdate('/students', editingStudent.id, {
                                            fullName: formData.get('studentName'),
                                            rollNo: formData.get('studentRoll'),
                                            semesterId: Number(formData.get('studentSemester')),
                                            seatPref: formData.get('seatPref'),
                                        });

                                        setEditingStudent(null);
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Full name" name="studentName" defaultValue={editingStudent.full_name} required />
                                    <Input label="Roll number" name="studentRoll" defaultValue={editingStudent.roll_no} required />
                                    <Select label="Semester" name="studentSemester" defaultValue={editingStudent.semester_id} required>
                                        <option value="">Select</option>
                                        {semesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.title}
                                            </option>
                                        ))}
                                    </Select>
                                    <MultiSelect
                                        label="Courses (select multiple)"
                                        name="studentCourses"
                                        options={courses}
                                        value={studentCourses.filter(sc => sc.student_id === editingStudent.id).map(sc => String(sc.course_id))}
                                        onChange={(selected) => {
                                            // This will be handled by the form submission
                                        }}
                                    />
                                    <Input label="Seat preference" name="seatPref" defaultValue={editingStudent.seat_pref || ''} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                                            Update
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingStudent(null);
                                                setStudentFormData({ courseIds: [] });
                                            }}
                                            className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    className="space-y-3"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const selectElement = e.target.querySelector('[name="studentCourses"]');
                                        const courseIds = Array.from(selectElement.selectedOptions, (opt) => opt.value);

                                        setStudentFormData({ courseIds });

                                        await handleEntityCreate('/students', {
                                            fullName: formData.get('studentName'),
                                            rollNo: formData.get('studentRoll'),
                                            semesterId: Number(formData.get('studentSemester')),
                                            seatPref: formData.get('seatPref'),
                                            courseIds: courseIds,
                                        });

                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Full name" name="studentName" placeholder="Areeba Khan" required />
                                    <Input label="Roll number" name="studentRoll" placeholder="CS-23-055" required />
                                    <Select label="Semester" name="studentSemester" required>
                                        <option value="">Select</option>
                                        {semesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.title}
                                            </option>
                                        ))}
                                    </Select>
                                    <MultiSelect
                                        label="Courses (select multiple)"
                                        name="studentCourses"
                                        options={courses}
                                        value={studentFormData.courseIds}
                                        onChange={(selected) => setStudentFormData(prev => ({ ...prev, courseIds: selected }))}
                                    />
                                    <Input label="Seat preference" name="seatPref" placeholder="Optional note" />
                                    <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                                        Save student
                                    </button>
                                </form>
                            )}
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {students.slice(0, 10).map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{student.full_name}</span>
                                            <span className="text-xs text-gray-500">{student.roll_no}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingStudent(student)}
                                                className="p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEntityDelete('/students', student.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {students.length > 10 && (
                                    <p className="text-xs text-gray-500 text-center">+{students.length - 10} more</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'rooms' && (
                        <div className="glass p-6 border border-white/10 space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Rooms</p>
                                <h3 className="text-xl font-display">Capacity + layout</h3>
                            </div>
                            {editingRoom ? (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityUpdate('/catalog/rooms', editingRoom.id, {
                                            code: formData.get('roomCode'),
                                            name: formData.get('roomName'),
                                            capacity: Number(formData.get('roomCapacity')),
                                            rows: Number(formData.get('roomRows')),
                                            cols: Number(formData.get('roomCols')),
                                            invigilatorName: formData.get('invigilator'),
                                        });
                                        setEditingRoom(null);
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Room code" name="roomCode" defaultValue={editingRoom.code} required />
                                    <Input label="Room name" name="roomName" defaultValue={editingRoom.name} required />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input label="Cap" name="roomCapacity" type="number" defaultValue={editingRoom.capacity} required />
                                        <Input label="Rows" name="roomRows" type="number" defaultValue={editingRoom.rows} required />
                                        <Input label="Cols" name="roomCols" type="number" defaultValue={editingRoom.cols} required />
                                    </div>
                                    <Input label="Invigilator" name="invigilator" defaultValue={editingRoom.invigilator_name || ''} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                                            Update
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingRoom(null)}
                                            className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityCreate('/catalog/rooms', {
                                            code: formData.get('roomCode'),
                                            name: formData.get('roomName'),
                                            capacity: Number(formData.get('roomCapacity')),
                                            rows: Number(formData.get('roomRows')),
                                            cols: Number(formData.get('roomCols')),
                                            invigilatorName: formData.get('invigilator'),
                                        });
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Room code" name="roomCode" placeholder="LAB-01" required />
                                    <Input label="Room name" name="roomName" placeholder="Innovation Lab" required />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input label="Cap" name="roomCapacity" type="number" required />
                                        <Input label="Rows" name="roomRows" type="number" required />
                                        <Input label="Cols" name="roomCols" type="number" required />
                                    </div>
                                    <Input label="Invigilator" name="invigilator" placeholder="Prof. Nauman" />
                                    <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                                        Save room
                                    </button>
                                </form>
                            )}
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {rooms.map((room) => (
                                    <div key={room.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{room.name}</span>
                                            <span className="text-xs text-gray-500">{room.code} • {room.capacity} seats</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingRoom(room)}
                                                className="p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEntityDelete('/catalog/rooms', room.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'courses' && (
                        <div className="glass p-6 border border-white/10 space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Courses</p>
                                <h3 className="text-xl font-display">Manage courses</h3>
                            </div>
                            {editingCourse ? (
                                <form
                                    className="space-y-3"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const semesterId = formData.get('courseSemester');
                                        const examDate = formData.get('courseExamDate') || '';

                                        setCourseFormData({
                                            semesterId,
                                            examDate,
                                        });

                                        await handleEntityUpdate('/catalog/courses', editingCourse.id, {
                                            code: formData.get('courseCode'),
                                            title: formData.get('courseTitle'),
                                        });

                                        setEditingCourse(null);
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Course code" name="courseCode" defaultValue={editingCourse.code} required />
                                    <Input label="Course title" name="courseTitle" defaultValue={editingCourse.title} required />
                                    <Select
                                        label="Semester"
                                        name="courseSemester"
                                        defaultValue={(() => {
                                            const firstRelation = semesterCourses.find(sc => sc.course_id === editingCourse.id);
                                            return firstRelation?.semester_id || '';
                                        })()}
                                        required
                                    >
                                        <option value="">Select semester</option>
                                        {semesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.title}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input
                                        label="Exam date"
                                        name="courseExamDate"
                                        type="date"
                                        defaultValue={(() => {
                                            const firstRelation = semesterCourses.find(sc => sc.course_id === editingCourse.id);
                                            return firstRelation?.exam_date || '';
                                        })()}
                                    />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                                            Update
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCourse(null);
                                                setCourseFormData({ semesterId: '', examDate: '' });
                                            }}
                                            className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    className="space-y-3"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const semesterId = formData.get('courseSemester');
                                        const examDate = formData.get('courseExamDate') || '';

                                        setCourseFormData({
                                            semesterId,
                                            examDate,
                                        });

                                        await handleEntityCreate('/catalog/courses', {
                                            code: formData.get('courseCode'),
                                            title: formData.get('courseTitle'),
                                        });

                                        e.currentTarget.reset();
                                        setCourseFormData({ semesterId: '', examDate: '' });
                                    }}
                                >
                                    <Input label="Course code" name="courseCode" placeholder="CS-301" required />
                                    <Input label="Course title" name="courseTitle" placeholder="Data Structures" required />
                                    <Select
                                        label="Semester"
                                        name="courseSemester"
                                        value={courseFormData.semesterId}
                                        onChange={(e) => setCourseFormData(prev => ({ ...prev, semesterId: e.target.value }))}
                                        required
                                    >
                                        <option value="">Select semester</option>
                                        {semesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.title}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input label="Exam date" name="courseExamDate" type="date" value={courseFormData.examDate} onChange={(e) => setCourseFormData(prev => ({ ...prev, examDate: e.target.value }))} />
                                    <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                                        Save course
                                    </button>
                                </form>
                            )}
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {courses.map((course) => (
                                    <div key={course.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{course.title}</span>
                                            <span className="text-xs text-gray-500">{course.code}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingCourse(course)}
                                                className="p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEntityDelete('/catalog/courses', course.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'semesters' && (
                        <div className="glass p-6 border border-white/10 space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Semesters</p>
                                <h3 className="text-xl font-display">Per department</h3>
                            </div>
                            {editingSem ? (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityUpdate('/catalog/semesters', editingSem.id, {
                                            departmentId: Number(formData.get('semesterDepartment')),
                                            title: formData.get('semesterTitle'),
                                        });
                                        setEditingSem(null);
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Select label="Department" name="semesterDepartment" defaultValue={editingSem.department_id} required>
                                        <option value="">Select</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input label="Semester title" name="semesterTitle" defaultValue={editingSem.title} required />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                                            Update
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingSem(null)}
                                            className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    className="space-y-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        handleEntityCreate('/catalog/semesters', {
                                            departmentId: Number(formData.get('semesterDepartment')),
                                            title: formData.get('semesterTitle'),
                                        });
                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Select label="Department" name="semesterDepartment" required>
                                        <option value="">Select</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input label="Semester title" name="semesterTitle" placeholder="BSCS - Term V" required />
                                    <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                                        Save semester
                                    </button>
                                </form>
                            )}
                            <div className="border-t border-white/5 pt-3 custom-scroll space-y-2 max-h-[300px] overflow-auto">
                                {semesters.map((sem) => (
                                    <div key={sem.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{sem.title + ' ' + sem.department_name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingSem(sem)}
                                                className="p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEntityDelete('/catalog/semesters', sem.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DetailEntities;