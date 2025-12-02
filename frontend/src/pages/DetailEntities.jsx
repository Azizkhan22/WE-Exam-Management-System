import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiGrid, FiLayers, FiDownload, FiArrowLeft, FiRefreshCw, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusMessage from '../components/StatusMessage';
import Input from '../components/Input';
import Select from '../components/Select';
import MultiSelect from '../components/MultiSelect';
import CSVDialog from '../components/CSVDialog';
import { Link } from 'react-router-dom';


const DetailEntities = () => {


    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);

    const [searchDepartments, setSearchDepartments] = useState([]);
    const [searchSemesters, setSearchSemesters] = useState([]);
    const [searchRooms, setSearchRooms] = useState([]);
    const [searchCourses, setSearchCourses] = useState([]);
    const [searchStudents, setSearchStudents] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [showCSVDialog, setShowCSVDialog] = useState(false);

    const [semesterCourses, setSemesterCourses] = useState([]);
    const [editingDept, setEditingDept] = useState(null);
    const [editingSem, setEditingSem] = useState(null);
    const [editingRoom, setEditingRoom] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [semesterSelectedCourses, setsemesterSelectedCourses] = useState([]);
    const [courseFormData, setCourseFormData] = useState({ semesterId: '', examDate: '' });
    const [loading, setLoading] = useState(true);
    const [formStatus, setFormStatus] = useState('');
    const [showMessage, setShowMessage] = useState(false);

    const [activeTab, setActiveTab] = useState('courses');

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
            ]);
            setDepartments(deps.data);
            setSemesters(sems.data);
            setRooms(rms.data);
            setCourses(crs.data);
            setStudents(studs.data);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCoreData();
    }, []);

    const searchEntity = (query, entityType) => {
        if (query === '') {
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        query = query.toLowerCase();
        if (entityType === 'students') {
            const filteredStudents = students.filter(student =>
                student.full_name.toLowerCase().includes(query) ||
                student.roll_no.toLowerCase().includes(query)
            );
            setSearchStudents(filteredStudents);
        } else if (entityType === 'departments') {
            const filteredDepts = departments.filter(dept =>
                dept.name.toLowerCase().includes(query));
            setSearchDepartments(filteredDepts);
        } else if (entityType === 'rooms') {
            const filteredRooms = rooms.filter(room =>
                room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query));
            setSearchRooms(filteredRooms);
        } else if (entityType === 'courses') {
            const filteredCourses = courses.filter(course =>
                course.title.toLowerCase().includes(query) || course.code.toLowerCase().includes(query));
            setSearchCourses(filteredCourses);
        } else if (entityType === 'semesters') {
            const filteredSems = semesters.filter(sem =>
                sem.title.toLowerCase().includes(query) || sem.department_name.toLowerCase().includes(query));
            setSearchSemesters(filteredSems);
        }
    };

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
            {showCSVDialog && <CSVDialog setShowCSVDialog={setShowCSVDialog} setFormStatus={setFormStatus} setShowMessage={setShowMessage} loadCoreData={loadCoreData} /> }
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Manage Entities</p>
                    <h1 className="text-4xl font-display">CRUD Panel</h1>
                    <div className="flex gap-2 items-center text-gray-400">
                        <FiArrowLeft />
                        <Link to="/dashboard" className="ml-2 underline">Back to Dashboard</Link>
                    </div>
                </div>               
                <div className='flex gap-[8px]'>
                    <button
                        type="button"
                        onClick={() => setShowCSVDialog(true)}
                        className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
                    >
                        Upload CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => loadCoreData()}
                        className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
                    >
                        <FiRefreshCw /> Refresh data
                    </button>
                </div>
            </header>
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                    {['courses', 'departments', 'semesters', 'rooms', 'students'].map((tab) => (
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
                            <div className='flex items-center gap-[20px] w-full'>
                                <h3 className="text-xl font-display flex-2">All {activeTab}</h3>
                                <div className='flex-1'>
                                    <Input name="searchQuery" placeholder="Search departments..." onChange={(e) => searchEntity(e.target.value, activeTab)} />
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3 space-y-2  overflow-auto max-h-[300px]">
                                {isSearching ? searchDepartments.map((dept) => (
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
                                )) : departments.map((dept) => (
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
                                {isSearching && searchDepartments.length === 0 && (
                                    <p className="text-sm text-gray-400">No departments found.</p>
                                )}
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

                                        await handleEntityUpdate('/students', editingStudent.id, {
                                            fullName: formData.get('studentName'),
                                            rollNo: formData.get('studentRoll'),
                                            semesterId: Number(formData.get('studentSemester')),
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
                                                {sem.title + " " + sem.department_name}
                                            </option>
                                        ))}
                                    </Select>
                                    <div className="flex justify-center items-center gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40 max-w-[200px]">
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

                                        await handleEntityCreate('/students', {
                                            fullName: formData.get('studentName'),
                                            rollNo: formData.get('studentRoll'),
                                            semesterId: Number(formData.get('studentSemester')),
                                        });

                                        e.currentTarget.reset();
                                    }}
                                >
                                    <Input label="Full name" name="studentName" placeholder="Areeba Khan" required />
                                    <Input label="Roll number" name="studentRoll" placeholder="455677" required />
                                    <Select label="Semester" name="studentSemester" required>
                                        <option value="">Select</option>
                                        {semesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.title + " " + sem.department_name}
                                            </option>
                                        ))}
                                    </Select>
                                    <div className='flex w-full justify-center items-center'>
                                        <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10 max-w-[200px]">
                                            Save student
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div className='flex items-center gap-[20px] w-full'>
                                <h3 className="text-xl font-display flex-2">All {activeTab}</h3>
                                <div className='flex-1'>
                                    <Input name="searchQuery" placeholder="Search students..." onChange={(e) => searchEntity(e.target.value, activeTab)} />
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {isSearching ? searchStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{student.full_name}</span>
                                            <span className="text-xs text-gray-500 block">{student.roll_no}</span>
                                            <span className="text-xs text-gray-500">{student.semester_title + " " + student.department_name}</span>
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
                                )) : students.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate">{student.full_name}</span>
                                            <span className="text-xs text-gray-500 block">{student.roll_no}</span>
                                            <span className="text-xs text-gray-500">{student.semester_title + " " + student.department_name}</span>
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
                                {isSearching && searchStudents.length === 0 && (
                                    <p className="text-sm text-gray-400">No students found.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'rooms' && (
                        <div className="glass p-6 border border-white/10 space-y-4 w-full">
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
                                    <div className="flex gap-2 justify-center items-center">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40 max-w-[200px]">
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
                                    <div className='flex justify-center items-center w-full'>
                                        <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10 max-w-[200px]">
                                            Save room
                                        </button>
                                    </div>

                                </form>
                            )}
                            <div className='flex items-center gap-[20px] w-full'>
                                <h3 className="text-xl font-display flex-2">All {activeTab}</h3>
                                <div className='flex-1'>
                                    <Input name="searchQuery" placeholder="Search rooms..." onChange={(e) => searchEntity(e.target.value, activeTab)} />
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {isSearching ? searchRooms.map((room) => (
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
                                )) : rooms.map((room) => (
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
                                {isSearching && searchRooms.length === 0 && (
                                    <p className="text-sm text-gray-400">No rooms found.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'courses' && (
                        <div className="glass p-6 border border-white/10 space-y-4 w-full">
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
                                    <Input
                                        label="Exam date"
                                        name="courseExamDate"
                                        type="date"
                                        defaultValue={(() => {
                                            const firstRelation = semesterCourses.find(sc => sc.course_id === editingCourse.id);
                                            return firstRelation?.exam_date || '';
                                        })()}
                                    />
                                    <div className="flex justify-center items-center gap-2">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40 max-w-[200px]">
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
                                    <Input label="Exam date" name="courseExamDate" type="date" value={courseFormData.examDate} onChange={(e) => setCourseFormData(prev => ({ ...prev, examDate: e.target.value }))} />
                                    <div className='flex justify-center items-center w-full'>
                                        <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10 max-w-[200px]">
                                            Save course
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div className='flex items-center gap-[20px] w-full'>
                                <h3 className="text-xl font-display flex-2">All {activeTab}</h3>
                                <div className='flex-1'>
                                    <Input name="searchQuery" placeholder="Search courses..." onChange={(e) => searchEntity(e.target.value, activeTab)} />
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
                                {isSearching ? searchCourses.map((course) => (
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
                                )) : courses.map((course) => (
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
                                {isSearching && searchCourses.length === 0 && (
                                    <p className="text-sm text-gray-400">No courses found.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'semesters' && (
                        <div className="glass p-6 border border-white/10 space-y-4 w-full">
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
                                            semesterCourses: formData.getAll('semesterCourses[]'),
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
                                    <MultiSelect
                                        label="Semester's Courses (For updation of courses select the new updated courses)"
                                        name="semesterCourses[]"
                                        options={courses}
                                        value={semesterSelectedCourses}
                                        onChange={(selected) => setsemesterSelectedCourses(selected)}
                                    />
                                    <div className="flex justify-center items-center gap-2 w-full">
                                        <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40 w-full max-w-[200px]">
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
                                            semesterCourses: formData.getAll('semesterCourses[]'),
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
                                    <MultiSelect
                                        label="Semester's Courses (select multiple)"
                                        name="semesterCourses[]"
                                        options={courses}
                                        value={semesterSelectedCourses}
                                        onChange={(selected) => setsemesterSelectedCourses(selected)}
                                    />
                                    <div className='flex justify-center items-center w-full'>
                                        <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10 max-w-[200px]">
                                            Save semester
                                        </button>
                                    </div>

                                </form>
                            )}
                            <div className='flex items-center gap-[20px] w-full'>
                                <h3 className="text-xl font-display flex-2">All {activeTab}</h3>
                                <div className='flex-1'>
                                    <Input name="searchQuery" placeholder="Search semesters..." onChange={(e) => searchEntity(e.target.value, activeTab)} />
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-3 custom-scroll space-y-2 max-h-[300px] overflow-auto">
                                {isSearching ? searchSemesters.map((sem) => (
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
                                )) : semesters.map((sem) => (
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
                                {isSearching && searchSemesters.length === 0 && (
                                    <p className="text-sm text-gray-400">No semesters found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DetailEntities;