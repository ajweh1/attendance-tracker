import React, { useState, useEffect, useCallback } from 'react';

const Icon = ({ iconClass }) => <i className={iconClass}></i>;

const AdminPage = () => {

    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
    const [newEmployeePassword, setNewEmployeePassword] = useState('');
    
    const [employees, setEmployees] = useState([]);
    const [filteredAttendanceRecords, setFilteredAttendanceRecords] = useState([]);
    
    const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState('all');
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editFormData, setEditFormData] = useState({ fullName: '', username: '', role: '' });

    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchEmployeesAPI = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return Promise.reject("No token");
        try {
            const response = await fetch('http://localhost:3001/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const usersData = await response.json();
                setEmployees(usersData);
                return usersData;
            } else {
                const errData = await response.json().catch(() => ({ message: `Failed to fetch users - Status: ${response.status}` }));
                setMessage(prev => `${prev} Error fetching users: ${errData.message}. `);
                return Promise.reject(errData.message);
            }
        } catch (err) {
            setMessage(prev => `${prev} Network error fetching users. `);
            console.error("Fetch users API error:", err);
            return Promise.reject(err);
        }
    }, []);

    const fetchAttendanceAPI = useCallback(async (employeeId = 'all') => {
        const token = localStorage.getItem('token');
        if (!token) return Promise.reject("No token");
        setIsLoading(true);
        let url = 'http://localhost:3001/api/admin/attendance/all';
        if (employeeId !== 'all' && employeeId !== '') {
            url += `?userId=${employeeId}`;
        }
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const attendanceData = await response.json();
                setFilteredAttendanceRecords(attendanceData);
                return attendanceData;
            } else {
                const errData = await response.json().catch(() => ({ message: `Failed to fetch attendance - Status: ${response.status}` }));
                setMessage(prev => `${prev} Error fetching attendance: ${errData.message}. `);
                return Promise.reject(errData.message);
            }
        } catch (err) {
            setMessage(prev => `${prev} Network error fetching attendance. `);
            console.error("Fetch attendance API error:", err);
            return Promise.reject(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchInitialAdminData = useCallback(async () => {
        setIsLoading(true);
        setMessage('Fetching initial admin data...');
        try {
            await Promise.all([fetchEmployeesAPI(), fetchAttendanceAPI('all')]);
            setMessage("Admin data loaded successfully.");
        } catch (error) {
            setMessage("Could not load all admin data. Please check the backend server and try refreshing.");
        } finally {
            setIsLoading(false);
        }
    }, [fetchEmployeesAPI, fetchAttendanceAPI]);

    useEffect(() => {
        fetchInitialAdminData();
    }, [fetchInitialAdminData]);

    const handleCreateEmployeeWithAPI = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!newEmployeeName || !newEmployeeUsername || !newEmployeePassword) {
            setMessage('Error: All fields are required.'); return;
        }
        if (newEmployeePassword.length < 6) {
            setMessage('Error: Password must be at least 6 characters long.'); return;
        }
        const token = localStorage.getItem('token');
        if (!token) { setMessage("Admin authentication error."); return; }
        
        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:3001/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fullName: newEmployeeName, username: newEmployeeUsername, password: newEmployeePassword }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`Employee "${newEmployeeName}" created successfully!`);
                setNewEmployeeName(''); setNewEmployeeUsername(''); setNewEmployeePassword('');
                fetchEmployeesAPI();
            } else {
                setMessage(`Error: ${data.message || 'Failed to create.'}`);
            }
        } catch (err) {
            setMessage('Network error or server unavailable when creating employee.');
            console.error("Create employee API error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUserClick = (employee) => {
        setEditingEmployee(employee);
        setEditFormData({ fullName: employee.full_name, username: employee.username, role: employee.role });
        setMessage('');
    };

    const handleDeleteUserClick = async (employeeId, employeeName) => {
        if (window.confirm(`Are you sure you want to delete employee: ${employeeName} (ID: ${employeeId})? This action cannot be undone and will delete their attendance records.`)) {
            const token = localStorage.getItem('token');
            if (!token) { setMessage("Admin authentication error."); return; }
            setIsSubmitting(true);
            setMessage('');
            try {
                const response = await fetch(`http://localhost:3001/api/admin/users/${employeeId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await response.json();
                if (response.ok) {
                    setMessage(data.message || `Employee ${employeeName} deleted successfully.`);
                    fetchEmployeesAPI();
                    if (String(employeeId) === selectedEmployeeForAttendance) {
                        setSelectedEmployeeForAttendance('all');
                        fetchAttendanceAPI('all');
                    }
                } else {
                    setMessage(`Error: ${data.message || 'Failed to delete employee.'}`);
                }
            } catch (err) {
                setMessage('Network error or server unavailable when deleting employee.');
                console.error("Delete employee API error:", err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        if (!editingEmployee) return;
        const token = localStorage.getItem('token');
        if (!token) { setMessage("Admin authentication error."); return; }

        setIsSubmitting(true);
        setMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/admin/users/${editingEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editFormData),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(data.message || `Employee ${editFormData.fullName} updated successfully.`);
                setEditingEmployee(null);
                fetchEmployeesAPI();
            } else {
                 setMessage(`Error: ${data.message || 'Failed to update employee.'}`);
            }
        } catch (err) {
            setMessage('Network error or server unavailable when updating employee.');
            console.error("Update employee API error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAttendanceFilterChange = (e) => {
        const employeeId = e.target.value;
        setSelectedEmployeeForAttendance(employeeId);
        fetchAttendanceAPI(employeeId);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const formatTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        return new Date(dateTimeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="min-h-screen py-8 px-4 pt-20">
            <div className="container mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Admin Dashboard</h2>
                {message && (<div className={`text-center text-sm p-3 rounded-md mb-6 shadow ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("unavailable") ? 'text-red-700 bg-red-100 border border-red-300' : 'text-green-700 bg-green-100 border border-green-300'}`}>{message}</div>)}
                {(isLoading && !message.toLowerCase().includes("successfully")) && <p className="text-center my-4 text-blue-600">Loading data...</p>}
                {editingEmployee && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Edit Employee: {editingEmployee.full_name}</h3>
                            <form onSubmit={handleUpdateEmployee} className="space-y-4">
                                <div><label htmlFor="edit-emp-name" className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" id="edit-emp-name" value={editFormData.fullName} onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" /></div>
                                <div><label htmlFor="edit-emp-username" className="block text-sm font-medium text-gray-700">Username</label><input type="text" id="edit-emp-username" value={editFormData.username} onChange={(e) => setEditFormData({...editFormData, username: e.target.value})} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" /></div>
                                <div><label htmlFor="edit-emp-role" className="block text-sm font-medium text-gray-700">Role</label><select id="edit-emp-role" value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"><option value="employee">Employee</option><option value="admin">Admin</option></select></div>
                                <div className="flex gap-4 pt-2"><button type="button" onClick={() => setEditingEmployee(null)} className="w-full py-2 px-4 bg-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-400 transition duration-300">Cancel</button><button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition duration-300 disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 flex flex-col gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Create New Employee</h3>
                            <form onSubmit={handleCreateEmployeeWithAPI} className="space-y-4">
                                <div><label htmlFor="emp-name" className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" id="emp-name" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" /></div>
                                <div><label htmlFor="emp-username" className="block text-sm font-medium text-gray-700">Username (Login ID)</label><input type="text" id="emp-username" value={newEmployeeUsername} onChange={(e) => setNewEmployeeUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" /></div>
                                <div><label htmlFor="emp-password" className="block text-sm font-medium text-gray-700">Password (min 6 chars)</label><input type="password" id="emp-password" value={newEmployeePassword} onChange={(e) => setNewEmployeePassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" /></div>
                                <button type="submit" disabled={isSubmitting || isLoading} className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Employee'}</button>
                            </form>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-gray-700">Employees List</h3><button onClick={fetchEmployeesAPI} disabled={isLoading} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50"><Icon iconClass="fas fa-sync-alt mr-1" /> Refresh</button></div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {employees.map(emp => (<tr key={emp.id}>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                                                <div className="text-sm text-gray-500">@{emp.username} ({emp.role})</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                <button onClick={() => handleEditUserClick(emp)} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 p-1" title="Edit" disabled={isSubmitting || isLoading}><Icon iconClass="fas fa-edit" /></button>
                                                <button onClick={() => handleDeleteUserClick(emp.id, emp.full_name)} className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1 ml-2" title="Delete" disabled={isSubmitting || isLoading}><Icon iconClass="fas fa-trash" /></button>
                                            </td>
                                        </tr>))}
                                        {employees.length === 0 && !isLoading && (<tr><td colSpan="2" className="px-6 py-4 text-center text-gray-500">No employees found.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                <h3 className="text-xl font-semibold text-gray-700">Attendance Records</h3>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <label htmlFor="employee-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by:</label>
                                    <select id="employee-filter" value={selectedEmployeeForAttendance} onChange={handleAttendanceFilterChange} className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm" disabled={isLoading} >
                                        <option value="all">All Employees</option>
                                        {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} (@{emp.username})</option>))}
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">{filteredAttendanceRecords.map(rec => (<tr key={rec.record_id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rec.full_name || 'N/A'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(rec.attendance_date)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(rec.check_in_time)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(rec.check_out_time)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rec.status}</td></tr>))}{filteredAttendanceRecords.length === 0 && !isLoading && (<tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No records found for filter.</td></tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
export default AdminPage;